import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { registerErrorHandler } from './plugins/error-handler.js'
import { authRoutes } from './modules/auth/routes.js'
import { botsRoutes } from './modules/bots/routes.js'
import { docsRoutes } from './modules/docs/routes.js'
import { chatRoutes } from './modules/chat/routes.js'
import { widgetRoutes } from './modules/widget/routes.js'
import { billingRoutes } from './modules/billing/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 25 * 1024 * 1024,
  })

  registerErrorHandler(app)

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  })

  // Preserve raw body for Stripe webhooks
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    ;(req as { rawBody?: Buffer }).rawBody = body as Buffer
    if (req.url?.includes('/billing/webhook')) {
      done(null, body)
      return
    }
    try {
      const json = body.length ? JSON.parse((body as Buffer).toString('utf8')) : {}
      done(null, json)
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  const publicDir = path.join(__dirname, '../public')

  app.get('/health', async () => ({ ok: true, service: 'knowbase-api' }))

  await app.register(authRoutes, { prefix: '/v1/auth' })
  await app.register(botsRoutes, { prefix: '/v1/bots' })
  await app.register(docsRoutes, { prefix: '/v1/bots' })
  await app.register(chatRoutes, { prefix: '/v1/bots' })
  await app.register(widgetRoutes, { prefix: '/v1/widget' })
  await app.register(billingRoutes, { prefix: '/v1/billing' })

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: false,
  })

  return app
}
