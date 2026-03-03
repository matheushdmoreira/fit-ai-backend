import {
  NotFoundError,
  SessionAlreadyStartedError,
  WorkoutPlanNotActiveError,
} from '../errors/index.js'
import { prisma } from '../lib/db.js'

interface InputDto {
  userId: string
  workoutPlanId: string
  workoutDayId: string
}

interface OutputDto {
  userWorkoutSessionId: string
}

export class StartWorkoutSessionUseCase {
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

    if (!workoutPlan.isActive) {
      throw new WorkoutPlanNotActiveError('Workout plan is not active')
    }

    const workoutDay = await prisma.workoutDay.findFirst({
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
    })

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found')
    }

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayId: dto.workoutDayId,
        completedAt: null,
      },
    })

    if (existingSession) {
      throw new SessionAlreadyStartedError(
        'A session for this day has already been started',
      )
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: dto.workoutDayId,
        startedAt: new Date(),
      },
    })

    return {
      userWorkoutSessionId: session.id,
    }
  }
}
