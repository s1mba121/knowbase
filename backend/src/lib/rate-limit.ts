import type { FastifyRequest } from 'fastify'
import { getRedis } from './redis.js'

/** Shared rate-limit options; uses Redis when REDIS_URL is configured. */
export async function buildRateLimitOptions(partial: Record<string, unknown> = {}) {
  const redis = await getRedis()
  return {
    global: false,
    ...(redis
      ? {
          redis,
          nameSpace: 'knowbase-rl-',
        }
      : {}),
    ...partial,
  }
}

export type RateLimitKeyGen = (request: FastifyRequest) => string
