import type { FastifyInstance } from 'fastify'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    const err = error as Error & { statusCode?: number }
    const statusCode = err.statusCode ?? 500
    const message = err.message || 'Internal Server Error'

    if (statusCode >= 500) {
      console.error('[error]', err)
    }

    reply.code(statusCode).send({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {}),
    })
  })
}

export function httpError(statusCode: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode })
}
