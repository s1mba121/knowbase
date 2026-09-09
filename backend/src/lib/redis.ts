import { config } from '../config.js'

type RedisClient = {
  quit: () => Promise<string>
  on: (event: string, cb: (err: Error) => void) => void
  connect: () => Promise<void>
}

let redis: RedisClient | null | undefined

/** Shared Redis client when REDIS_URL is set; otherwise null (in-memory rate limits). */
export async function getRedis(): Promise<RedisClient | null> {
  if (redis !== undefined) return redis
  if (!config.REDIS_URL) {
    redis = null
    return null
  }

  try {
    const mod = await import('ioredis')
    const IORedis = (mod.default ?? mod) as unknown as new (
      url: string,
      opts?: Record<string, unknown>,
    ) => RedisClient
    const client = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    })
    await client.connect()
    client.on('error', (err: Error) => {
      console.error('[redis]', err.message)
    })
    redis = client
    console.log('[redis] connected for shared rate-limit store')
    return redis
  } catch (err) {
    console.warn(
      '[redis] unavailable, falling back to in-memory rate limits:',
      err instanceof Error ? err.message : err,
    )
    redis = null
    return null
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {})
  }
  redis = undefined
}
