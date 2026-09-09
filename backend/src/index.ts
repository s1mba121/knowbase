import { buildApp } from './app.js'
import { config } from './config.js'
import { closeRedis } from './lib/redis.js'
import { startIngestWorker } from './lib/ingest-worker.js'
import { markDraining } from './lib/runtime-metrics.js'
import { defaultWorkerId } from './lib/ingest-jobs.js'

const app = await buildApp()
let stopIngest: (() => void) | null = null

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`Knowbase API listening on ${config.BACKEND_URL}`)

  if (config.INGEST_EMBEDDED_WORKER) {
    stopIngest = startIngestWorker({ workerId: defaultWorkerId('api') })
  } else {
    console.log('[ingest-worker] embedded worker disabled (INGEST_EMBEDDED_WORKER=false)')
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  markDraining(true)
  stopIngest?.()
  app.log.info({ signal }, 'Graceful shutdown started')

  const forceTimer = setTimeout(() => {
    app.log.error('Forced exit after shutdown timeout')
    process.exit(1)
  }, 20_000)
  forceTimer.unref()

  try {
    await app.close()
    await closeRedis()
    app.log.info('HTTP server closed')
    process.exit(0)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
