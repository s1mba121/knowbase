import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => i.message).join('; ') || 'Invalid request'
      return reply.code(400).send({ error: message })
    }

    const err = error as Error & { statusCode?: number; validation?: unknown }
    if (err.validation) {
      return reply.code(400).send({ error: 'Invalid request' })
    }

    const statusCode = err.statusCode ?? 500
    const isProd = process.env.NODE_ENV === 'production'
    const message =
      statusCode >= 500 && isProd
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error'

    if (statusCode >= 500) {
      console.error('[error]', err)
    }

    return reply.code(statusCode).send({
      error: message,
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
