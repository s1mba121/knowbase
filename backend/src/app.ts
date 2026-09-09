import Fastify from 'fastify'
import cors from '@fastify/cors'
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

const APP_ORIGINS = [config.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(
  (v, i, arr) => arr.indexOf(v) === i,
)

function isAppOrigin(origin: string | undefined): boolean {
  if (!origin) return true // curl / Stripe / same-origin tools
  return APP_ORIGINS.includes(origin)
}

export async function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1 * 1024 * 1024, // default JSON 1MB; multipart has its own limit
  })

  registerErrorHandler(app)

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false, // widget.js is embedded on third-party sites
  })

  // —— Public widget API: permissive CORS + rate limits ——
  await app.register(async (widgetScope) => {
    await widgetScope.register(cors, {
      origin: true,
      credentials: false,
      methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    })

    await widgetScope.register(widgetRoutes, { prefix: '/v1/widget' })
  })

  // —— Authenticated app API: locked CORS ——
  await app.register(async (apiScope) => {
    await apiScope.register(cors, {
      origin: (origin, cb) => {
        cb(null, isAppOrigin(origin))
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })

    await apiScope.register(multipart, {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    })

    // Preserve raw body for Stripe webhooks
    apiScope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
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

    await apiScope.register(authRoutes, { prefix: '/v1/auth' })
    await apiScope.register(botsRoutes, { prefix: '/v1/bots' })
    await apiScope.register(docsRoutes, { prefix: '/v1/bots' })
    await apiScope.register(chatRoutes, { prefix: '/v1/bots' })
    await apiScope.register(billingRoutes, { prefix: '/v1/billing' })
  })

  app.get('/health', async () => ({ ok: true, service: 'knowbase-api' }))

  const publicDir = path.join(__dirname, '../public')
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: false,
  })

  return app
}
