import Fastify, { type FastifyRequest } from 'fastify'
import cors, { type FastifyCorsOptions } from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { registerErrorHandler } from './plugins/error-handler.js'
import { registerObservability } from './plugins/observability.js'
import { getIngestStats } from './lib/ingest-worker.js'
import { getOpenAIGateStats } from './lib/openai-gate.js'
import { getRuntimeMetrics, isDraining } from './lib/runtime-metrics.js'
import { getRedis } from './lib/redis.js'
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
  await getRedis()

  const app = Fastify({
    logger: {
      level: 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            requestId: request.id,
          }
        },
      },
    },
    genReqId: (req) => {
      const incoming = req.headers['x-request-id']
      return typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID()
    },
    requestIdHeader: 'x-request-id',
    bodyLimit: 1 * 1024 * 1024,
    requestTimeout: 120_000,
    connectionTimeout: 15_000,
  })

  registerErrorHandler(app)
  await registerObservability(app)

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    // Widget is loaded cross-origin from customer sites + Embed preview (web ≠ api origin).
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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

  app.get('/health', async () => ({
    ok: true,
    service: 'knowbase-api',
    draining: isDraining(),
  }))

  app.get('/ready', async (_request, reply) => {
    if (isDraining()) {
      return reply.code(503).send({ ok: false, reason: 'draining' })
    }
    return { ok: true, service: 'knowbase-api' }
  })

  app.get('/metrics', async () => ({
    service: 'knowbase-api',
    ...getRuntimeMetrics(),
    ingest: await getIngestStats(),
    openaiGate: getOpenAIGateStats(),
    redis: Boolean(config.REDIS_URL),
  }))

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
