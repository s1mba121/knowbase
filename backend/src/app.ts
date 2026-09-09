import Fastify, { type FastifyRequest } from 'fastify'
import cors, { type FastifyCorsOptions } from '@fastify/cors'
import helmet from '@fastify/helmet'
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

const APP_ORIGINS = new Set(
  [config.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean),
)

function isWidgetPath(url: string): boolean {
  return url.startsWith('/v1/widget') || url.startsWith('/widget.js')
}

export async function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1 * 1024 * 1024,
  })

  registerErrorHandler(app)

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  })

  // Single CORS registration (avoids duplicate OPTIONS *); policy depends on path
  await app.register(cors, () => {
    return (req: FastifyRequest, callback: (err: Error | null, opts?: FastifyCorsOptions) => void) => {
      const url = req.url.split('?')[0] ?? ''
      if (isWidgetPath(url)) {
        callback(null, {
          origin: true,
          credentials: false,
          methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
        })
        return
      }

      callback(null, {
        origin: (origin, cb) => {
          if (!origin) {
            cb(null, true)
            return
          }
          cb(null, APP_ORIGINS.has(origin))
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      })
    }
  })

  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  })

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

  app.get('/health', async () => ({ ok: true, service: 'knowbase-api' }))

  await app.register(authRoutes, { prefix: '/v1/auth' })
  await app.register(botsRoutes, { prefix: '/v1/bots' })
  await app.register(docsRoutes, { prefix: '/v1/bots' })
  await app.register(chatRoutes, { prefix: '/v1/bots' })
  await app.register(widgetRoutes, { prefix: '/v1/widget' })
  await app.register(billingRoutes, { prefix: '/v1/billing' })

  const publicDir = path.join(__dirname, '../public')
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: false,
  })

  return app
}
