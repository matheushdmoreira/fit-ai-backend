import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { auth } from '../lib/auth.js'
import {
  ErrorSchema,
  GetUserTrainDataSchema,
  UpsertUserTrainDataBodySchema,
  UpsertUserTrainDataSchema,
} from '../schemas/index.js'
import { GetUserTrainDataUseCase } from '../use-cases/GetUserTrainDataUseCase.js'
import { UpsertUserTrainDataUseCase } from '../use-cases/UpsertUserTrainDataUseCase.js'

export const meRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/',
    schema: {
      operationId: 'getUserTrainData',
      tags: ['Me'],
      summary: 'Get authenticated user train data',
      response: {
        200: GetUserTrainDataSchema,
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

        const getUserTrainData = new GetUserTrainDataUseCase()
        const result = await getUserTrainData.execute({
          userId: session.user.id,
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
    method: 'PUT',
    url: '/',
    schema: {
      operationId: 'upsertUserTrainData',
      tags: ['Me'],
      summary: 'Upsert user train data',
      body: UpsertUserTrainDataBodySchema,
      response: {
        200: UpsertUserTrainDataSchema,
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

        const upsertUserTrainData = new UpsertUserTrainDataUseCase()
        const result = await upsertUserTrainData.execute({
          userId: session.user.id,
          weightInGrams: request.body.weightInGrams,
          heightInCentimeters: request.body.heightInCentimeters,
          age: request.body.age,
          bodyFatPercentage: request.body.bodyFatPercentage,
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
}
