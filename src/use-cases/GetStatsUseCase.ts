import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

import { NotFoundError } from '../errors/index.js'
import type { WeekDay } from '../generated/prisma/enums.js'
import { prisma } from '../lib/db.js'

dayjs.extend(utc)

interface InputDto {
  userId: string
  from: string
  to: string
}

interface OutputDto {
  workoutStreak: number
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean
      workoutDayStarted: boolean
    }
  >
  completedWorkoutsCount: number
  conclusionRate: number
  totalTimeInSeconds: number
}

const DAYJS_TO_WEEKDAY: Record<number, WeekDay> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
}

export class GetStatsUseCase {
  async execute(dto: InputDto): Promise<OutputDto> {
    const fromDate = dayjs.utc(dto.from, 'YYYY-MM-DD').startOf('day')
    const toDate = dayjs.utc(dto.to, 'YYYY-MM-DD').endOf('day')

    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.toDate(),
        },
      },
    })

    const consistencyByDay = this.buildConsistencyByDay(sessions)
    const completedWorkoutsCount = sessions.filter(
      (s) => s.completedAt !== null,
    ).length
    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0
    const totalTimeInSeconds = this.calculateTotalTime(sessions)

    const workoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: true,
      },
    })

    if (!workoutPlan) {
      throw new NotFoundError('Active workout plan not found')
    }

    const workoutStreak = this.calculateWorkoutStreak(
      dayjs.utc(dto.to, 'YYYY-MM-DD'),
      workoutPlan.workoutDays,
      sessions,
    )

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    }
  }

  private buildConsistencyByDay(
    sessions: Array<{ startedAt: Date; completedAt: Date | null }>,
  ): OutputDto['consistencyByDay'] {
    const sessionsByDate = new Map<
      string,
      { started: boolean; completed: boolean }
    >()

    for (const session of sessions) {
      const dateKey = dayjs.utc(session.startedAt).format('YYYY-MM-DD')
      const existing = sessionsByDate.get(dateKey)
      const completed = session.completedAt !== null

      if (existing) {
        sessionsByDate.set(dateKey, {
          started: true,
          completed: existing.completed || completed,
        })
      } else {
        sessionsByDate.set(dateKey, { started: true, completed })
      }
    }

    const consistency: OutputDto['consistencyByDay'] = {}
    for (const [dateKey, data] of sessionsByDate) {
      consistency[dateKey] = {
        workoutDayStarted: data.started,
        workoutDayCompleted: data.completed,
      }
    }

    return consistency
  }

  private calculateTotalTime(
    sessions: Array<{ startedAt: Date; completedAt: Date | null }>,
  ): number {
    let total = 0
    for (const session of sessions) {
      if (session.completedAt) {
        const diff = dayjs
          .utc(session.completedAt)
          .diff(dayjs.utc(session.startedAt), 'second')
        total += diff
      }
    }
    return total
  }

  private calculateWorkoutStreak(
    referenceDate: dayjs.Dayjs,
    workoutDays: Array<{ weekDay: WeekDay; isRest: boolean }>,
    sessions: Array<{ startedAt: Date; completedAt: Date | null }>,
  ): number {
    const workoutDaysByWeekDay = new Map<WeekDay, { isRest: boolean }>()
    for (const day of workoutDays) {
      workoutDaysByWeekDay.set(day.weekDay, { isRest: day.isRest })
    }

    const completedDates = new Set<string>()
    for (const session of sessions) {
      if (session.completedAt !== null) {
        completedDates.add(dayjs.utc(session.startedAt).format('YYYY-MM-DD'))
      }
    }

    const lookbackDays = 90
    let streak = 0
    for (let i = 0; i <= lookbackDays; i++) {
      const checkDate = referenceDate.subtract(i, 'day')
      const weekDay = DAYJS_TO_WEEKDAY[checkDate.day()]
      const planDay = workoutDaysByWeekDay.get(weekDay)

      if (!planDay) {
        continue
      }

      if (planDay.isRest) {
        streak++
        continue
      }

      const dateKey = checkDate.format('YYYY-MM-DD')
      if (completedDates.has(dateKey)) {
        streak++
      } else {
        break
      }
    }

    return streak
  }
}
