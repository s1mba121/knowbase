import { config } from './config.js'
import { startIngestWorker } from './lib/ingest-worker.js'
import { defaultWorkerId } from './lib/ingest-jobs.js'
import { closeRedis } from './lib/redis.js'

/**
 * Dedicated ingest worker process.
 * Prefer this in production and set INGEST_EMBEDDED_WORKER=false on the API.
 */
console.log(`Knowbase ingest worker starting (concurrency=${config.INGEST_CONCURRENCY})`)
const stop = startIngestWorker({
  workerId: defaultWorkerId('worker'),
  pollIntervalMs: 1000,
})

async function shutdown(signal: string) {
  console.log(`[ingest-worker] ${signal}, shutting down`)
  stop()
  await closeRedis()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
