import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => i.message).join('; ') || 'Invalid request'
      return reply.code(400).send({ error: message, requestId: request.id })
    }

    const err = error as Error & { statusCode?: number; validation?: unknown }
    if (err.validation) {
      return reply.code(400).send({ error: 'Invalid request', requestId: request.id })
    }

    const statusCode = err.statusCode ?? 500
    const isProd = process.env.NODE_ENV === 'production'
    const message =
      statusCode >= 500 && isProd
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error'

    if (statusCode >= 500) {
      request.log.error({ err, requestId: request.id }, 'request failed')
    } else {
      request.log.warn({ err: err.message, requestId: request.id, statusCode }, 'request error')
    }

    return reply.code(statusCode).send({
      error: message,
      requestId: request.id,
      ...(!isProd && statusCode >= 500 ? { stack: err.stack } : {}),
    })
  })
}

export function httpError(statusCode: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode })
}

export function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || request.ip
  }
  return request.ip
}
