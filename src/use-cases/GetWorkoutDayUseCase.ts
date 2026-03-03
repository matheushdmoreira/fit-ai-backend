import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

import { NotFoundError } from '../errors/index.js'
import type { WeekDay } from '../generated/prisma/enums.js'
import { prisma } from '../lib/db.js'

dayjs.extend(utc)

interface InputDto {
  userId: string
  workoutPlanId: string
  workoutDayId: string
}

interface OutputDto {
  id: string
  name: string
  isRest: boolean
  coverImageUrl?: string
  estimatedDurationInSeconds: number
  weekDay: WeekDay
  exercises: Array<{
    id: string
    name: string
    order: number
    workoutDayId: string
    sets: number
    reps: number
    restTimeInSeconds: number
  }>
  sessions: Array<{
    id: string
    workoutDayId: string
    startedAt: string
    completedAt?: string
  }>
}

export class GetWorkoutDayUseCase {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        id: dto.workoutPlanId,
        userId: dto.userId,
      },
    })

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found')
    }

    const workoutDay = await prisma.workoutDay.findFirst({
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
        },
        sessions: {
          orderBy: { startedAt: 'desc' },
        },
      },
    })

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found')
    }

    return {
      id: workoutDay.id,
      name: workoutDay.name,
      isRest: workoutDay.isRest,
      coverImageUrl: workoutDay.coverImageUrl ?? undefined,
      estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
      weekDay: workoutDay.weekDay,
      exercises: workoutDay.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        order: exercise.order,
        workoutDayId: exercise.workoutDayId,
        sets: exercise.sets,
        reps: exercise.reps,
        restTimeInSeconds: exercise.restTimeInSeconds,
      })),
      sessions: workoutDay.sessions.map((session) => ({
        id: session.id,
        workoutDayId: session.workoutDayId,
        startedAt: dayjs.utc(session.startedAt).format('YYYY-MM-DD'),
        completedAt: session.completedAt
          ? dayjs.utc(session.completedAt).format('YYYY-MM-DD')
          : undefined,
      })),
    }
  }
}
