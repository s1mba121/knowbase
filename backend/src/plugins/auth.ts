import type { FastifyReply, FastifyRequest } from 'fastify'
import { supabaseAdmin } from '../lib/supabase.js'

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
    return reply.code(401).send({ error: 'Missing authorization token' })
  }

  const token = header.slice('Bearer '.length)
  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }

  request.user = {
    id: data.user.id,
    email: data.user.email ?? '',
  }
}
