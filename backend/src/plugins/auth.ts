import type { FastifyReply, FastifyRequest } from 'fastify'
import { supabaseAdmin } from '../lib/supabase.js'
import { formatError, isTransientNetworkError } from '../lib/errors.js'

export type AuthUser = {
  id: string
  email: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing authorization token', requestId: request.id })
  }

  const token = header.slice('Bearer '.length)

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data.user) {
      if (error && isTransientNetworkError(error)) {
        request.log.warn({ err: formatError(error), requestId: request.id }, 'auth upstream unavailable')
        return reply
          .code(503)
          .send({ error: 'Auth service temporarily unavailable', requestId: request.id })
      }
      return reply.code(401).send({ error: 'Invalid or expired token', requestId: request.id })
    }

    request.user = {
      id: data.user.id,
      email: data.user.email ?? '',
    }
  } catch (err) {
    if (isTransientNetworkError(err)) {
      request.log.warn({ err: formatError(err), requestId: request.id }, 'auth upstream unavailable')
      return reply
        .code(503)
        .send({ error: 'Auth service temporarily unavailable', requestId: request.id })
    }
    request.log.error({ err: formatError(err), requestId: request.id }, 'auth guard failed')
    return reply.code(401).send({ error: 'Invalid or expired token', requestId: request.id })
  }
}
