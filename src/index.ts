import 'dotenv/config'

import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import ScalarApiReference from '@scalar/fastify-api-reference'
import Fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { auth } from './lib/auth.js'
import { env } from './lib/env.js'
import { aiRoutes } from './routes/ai.js'
import { homeRoutes } from './routes/home.js'
import { meRoutes } from './routes/me.js'
import { statsRoutes } from './routes/stats.js'
import { workoutPlanRoutes } from './routes/workout-plan.js'

const envToLogger = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  production: true,
  test: false,
}

const app = Fastify({
  logger: envToLogger[env.NODE_ENV],
  trustProxy: true,
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Fit AI API',
      description: 'API for the Fit AI application',
      version: '1.0.0',
    },
    servers: [
      {
        description: 'Localhost',
        url: env.API_BASE_URL,
      },
    ],
  },
  transform: jsonSchemaTransform,
})

app.register(fastifyCors, {
  origin: [env.WEB_APP_BASE_URL],
  credentials: true,
})

await app.register(ScalarApiReference, {
  routePrefix: '/docs',
  configuration: {
    sources: [
      {
        title: 'Fit AI API',
        slug: 'fit-ai-api',
        url: '/swagger.json',
      },
      {
        title: 'Auth API',
        slug: 'auth-api',
        url: '/api/auth/open-api/generate-schema',
      },
    ],
  },
})

await app.register(aiRoutes, { prefix: '/ai' })
await app.register(meRoutes, { prefix: '/me' })
await app.register(homeRoutes, { prefix: '/home' })
await app.register(statsRoutes, { prefix: '/stats' })
await app.register(workoutPlanRoutes, { prefix: '/workout-plans' })

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/swagger.json',
  schema: {
    hide: true,
  },
  handler: (_, res) => {
    res.send(app.swagger())
  },
})

app.route({
  method: ['GET', 'POST'],
  url: '/api/auth/*',
  schema: {
    hide: true,
  },
  async handler(request, reply) {
    try {
      const forwardedProto = request.headers['x-forwarded-proto']
      const forwardedHost = request.headers['x-forwarded-host']
      const protocol =
        (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
          ?.split(',')[0]
          ?.trim() ||
        request.protocol ||
        'http'
      const host =
        (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
          ?.split(',')[0]
          ?.trim() || request.headers.host

      if (!host) {
        throw new Error('Missing host header in auth request')
      }

      // Rebuild the public URL so Better Auth can infer secure cookies correctly behind proxies.
      const url = new URL(request.url, `${protocol}://${host}`)

      // Convert Fastify headers to standard Headers object
      const headers = new Headers()
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString())
      })
      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      })
      // Process authentication request
      const response = await auth.handler(req)
      // Forward response to client
      reply.status(response.status)

      const setCookies = response.headers.getSetCookie()
      if (setCookies.length > 0) {
        reply.header('set-cookie', setCookies)
      }

      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          return
        }

        reply.header(key, value)
      })

      reply.send(response.body ? await response.text() : null)
    } catch (error) {
      app.log.error(error)

      reply.status(500).send({
        error: 'Internal authentication error',
        code: 'AUTH_FAILURE',
      })
    }
  },
})

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
    if (env.NODE_ENV !== 'production') {
      console.log('🔥 HTTP server running on http://localhost:3333')
      console.log('📚 Docs available at http://localhost:3333/docs')
    } else {
      console.log('🔥 HTTP server running!')
    }
  })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
