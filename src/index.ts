import 'dotenv/config'
import fastifySwagger from '@fastify/swagger'
import ScalarApiReference from '@scalar/fastify-api-reference'
import Fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import z from 'zod'

const app = Fastify({
  // logger: true,
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
        url: 'http://localhost:3333',
      },
    ],
  },
  transform: jsonSchemaTransform,
})

await app.register(ScalarApiReference, {
  routePrefix: '/docs',
})

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  schema: {
    description: 'Get the root endpoint',
    tags: ['root'],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: (_, res) => {
    res.send({ message: `Hello World` })
  },
})

try {
  await app
    .listen({ port: Number(process.env.PORT) ?? 3333, host: '0.0.0.0' })
    .then(() => {
      console.log('🔥 HTTP server running on http://localhost:3333')
      console.log('📚 Docs available at http://localhost:3333/docs')
    })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
