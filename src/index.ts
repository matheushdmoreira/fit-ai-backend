import 'dotenv/config'
import Fastify from 'fastify'

const app = Fastify({
  logger: true,
})

app.get('/', () => {
  return { hello: 'world' }
})

try {
  await app.listen({ port: Number(process.env.PORT) ?? 3333 })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
