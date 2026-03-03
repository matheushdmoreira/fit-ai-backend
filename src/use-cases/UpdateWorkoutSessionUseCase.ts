import { NotFoundError } from '../errors/index.js'
import { prisma } from '../lib/db.js'

interface InputDto {
  userId: string
  workoutPlanId: string
  workoutDayId: string
  sessionId: string
  completedAt: string
}

interface OutputDto {
  id: string
  completedAt: string
  startedAt: string
}

export class UpdateWorkoutSessionUseCase {
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
    })

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found')
    }

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id: dto.sessionId,
        workoutDayId: dto.workoutDayId,
      },
    })

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found')
    }

    const updatedSession = await prisma.workoutSession.update({
      where: { id: dto.sessionId },
      data: {
        completedAt: new Date(dto.completedAt),
      },
    })

    const completedAt = updatedSession.completedAt ?? new Date(dto.completedAt)

    return {
      id: updatedSession.id,
      completedAt: completedAt.toISOString(),
      startedAt: updatedSession.startedAt.toISOString(),
    }
  }
}
