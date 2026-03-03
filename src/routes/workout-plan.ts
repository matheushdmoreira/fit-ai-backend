import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import {
  NotFoundError,
  SessionAlreadyStartedError,
  WorkoutPlanNotActiveError,
} from '../errors/index.js'
import { auth } from '../lib/auth.js'
import {
  ErrorSchema,
  GetWorkoutDaySchema,
  GetWorkoutPlanSchema,
  ListWorkoutPlansSchema,
  StartWorkoutSessionSchema,
  UpdateWorkoutSessionBodySchema,
  UpdateWorkoutSessionSchema,
  WorkoutPlanSchema,
} from '../schemas/index.js'
import { CreateWorkoutPlanUseCase } from '../use-cases/CreateWorkoutPlanUseCase.js'
import { GetWorkoutDayUseCase } from '../use-cases/GetWorkoutDayUseCase.js'
import { GetWorkoutPlanUseCase } from '../use-cases/GetWorkoutPlanUseCase.js'
import { ListWorkoutPlansUseCase } from '../use-cases/ListWorkoutPlansUseCase.js'
import { StartWorkoutSessionUseCase } from '../use-cases/StartWorkoutSessionUseCase.js'
import { UpdateWorkoutSessionUseCase } from '../use-cases/UpdateWorkoutSessionUseCase.js'

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Create a workout plan',
      body: WorkoutPlanSchema.omit({ id: true }),
      response: {
        201: WorkoutPlanSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        })

        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          })
        }

        const createWorkoutPlan = new CreateWorkoutPlanUseCase()
        const result = await createWorkoutPlan.execute({
          userId: session.user.id,
          name: request.body.name,
          workoutDays: request.body.workoutDays,
        })

        return reply.status(201).send(result)
      } catch (error) {
        app.log.error(error)

        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND_ERROR',
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      }
    },
  })

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/',
    schema: {
      tags: ['Workout Plan'],
      summary: 'List workout plans',
      querystring: z.object({
        active: z
          .enum(['true', 'false'])
          .transform((val) => val === 'true')
          .optional(),
      }),
      response: {
        200: ListWorkoutPlansSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        })

        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          })
        }

        const listWorkoutPlans = new ListWorkoutPlansUseCase()
        const result = await listWorkoutPlans.execute({
          userId: session.user.id,
          active: request.query.active,
        })

        return reply.status(200).send(result)
      } catch (error) {
        app.log.error(error)

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      }
    },
  })

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:workoutPlanId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Get a workout plan',
      params: z.object({
        workoutPlanId: z.uuid(),
      }),
      response: {
        200: GetWorkoutPlanSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        })

        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          })
        }

        const getWorkoutPlan = new GetWorkoutPlanUseCase()
        const result = await getWorkoutPlan.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
        })

        return reply.status(200).send(result)
      } catch (error) {
        app.log.error(error)

        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND_ERROR',
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      }
    },
  })

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:workoutPlanId/days/:workoutDayId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Get a workout day',
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        200: GetWorkoutDaySchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        })

        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          })
        }

        const getWorkoutDay = new GetWorkoutDayUseCase()
        const result = await getWorkoutDay.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
        })

        return reply.status(200).send(result)
      } catch (error) {
        app.log.error(error)

        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND_ERROR',
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      }
    },
  })

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/:workoutPlanId/days/:workoutDayId/sessions',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Start a workout session',
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        201: StartWorkoutSessionSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        422: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        })

        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          })
        }

        const startWorkoutSession = new StartWorkoutSessionUseCase()
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
        })

        return reply.status(201).send(result)
      } catch (error) {
        app.log.error(error)

        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND_ERROR',
          })
        }

        if (error instanceof WorkoutPlanNotActiveError) {
          return reply.status(422).send({
            error: error.message,
            code: 'WORKOUT_PLAN_NOT_ACTIVE_ERROR',
          })
        }

        if (error instanceof SessionAlreadyStartedError) {
          return reply.status(409).send({
            error: error.message,
            code: 'SESSION_ALREADY_STARTED_ERROR',
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      }
    },
  })

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/:workoutPlanId/days/:workoutDayId/sessions/:sessionId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Update a workout session',
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
        sessionId: z.uuid(),
      }),
      body: UpdateWorkoutSessionBodySchema,
      response: {
        200: UpdateWorkoutSessionSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        })

        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          })
        }

        const updateWorkoutSession = new UpdateWorkoutSessionUseCase()
        const result = await updateWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
          sessionId: request.params.sessionId,
          completedAt: request.body.completedAt,
        })

        return reply.status(200).send(result)
      } catch (error) {
        app.log.error(error)

        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND_ERROR',
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      }
    },
  })
}
