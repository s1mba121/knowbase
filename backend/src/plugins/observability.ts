import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import {
  isDraining,
  onRequestEnd,
  onRequestStart,
} from '../lib/runtime-metrics.js'

export async function registerObservability(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (isDraining() && !request.url.startsWith('/health') && !request.url.startsWith('/ready')) {
      return reply.code(503).send({ error: 'Server is shutting down' })
    }

    const incoming = request.headers['x-request-id']
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID()
    request.headers['x-request-id'] = requestId
    reply.header('x-request-id', requestId)
    ;(request as { startedAt?: number }).startedAt = Date.now()
    onRequestStart()
  })

  app.addHook('onResponse', async (request, reply) => {
    const startedAt = (request as { startedAt?: number }).startedAt ?? Date.now()
    const durationMs = Date.now() - startedAt
    reply.header('x-response-time', `${durationMs}ms`)
    onRequestEnd({ ok: reply.statusCode < 500, durationMs })
  })
}
