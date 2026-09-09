import { config } from '../config.js'
import { formatError, isTransientNetworkError } from './errors.js'
import {
  claimIngestJobs,
  completeIngestJob,
  defaultWorkerId,
  failIngestJob,
  getIngestQueueSnapshot,
  requeueStaleIngestJobs,
  type IngestJob,
} from './ingest-jobs.js'
import { markDocumentFailed, processDocumentIngest } from './ingest-process.js'
import { Semaphore } from './semaphore.js'

let completed = 0
let failed = 0
let localActive = 0

export function getIngestWorkerStats() {
  return {
    localActive,
    completed,
    failed,
    concurrency: config.INGEST_CONCURRENCY,
  }
}

export async function getIngestStats() {
  const queue = await getIngestQueueSnapshot().catch(() => ({
    activeTotal: null as number | null,
    queued: 0,
    running: 0,
    maxQueued: config.INGEST_MAX_QUEUED,
    maxConcurrent: config.INGEST_CONCURRENCY,
  }))
  return {
    ...queue,
    worker: getIngestWorkerStats(),
  }
}

async function runJob(job: IngestJob): Promise<void> {
  localActive += 1
  try {
    await processDocumentIngest(job.document_id)
    await completeIngestJob(job.id)
    completed += 1
  } catch (err) {
    failed += 1
    const message = formatError(err)
    console.error('[ingest]', job.id, message)
    await failIngestJob(job, message)
    if (job.attempts >= job.max_attempts) {
      await markDocumentFailed(job.document_id, message)
    }
  } finally {
    localActive -= 1
  }
}

/**
 * Poll Postgres ingest_jobs with SKIP LOCKED.
 * Survives API restarts; safe with multiple workers.
 */
export function startIngestWorker(opts?: {
  workerId?: string
  pollIntervalMs?: number
}): () => void {
  const workerId = opts?.workerId ?? defaultWorkerId('api')
  const basePollMs = opts?.pollIntervalMs ?? 1500
  const gate = new Semaphore(config.INGEST_CONCURRENCY)
  let stopped = false
  let timer: NodeJS.Timeout | null = null
  let backoffMs = basePollMs
  let lastNetworkWarnAt = 0

  const scheduleNext = (delay: number) => {
    if (stopped) return
    timer = setTimeout(() => void tick(), delay)
    timer.unref?.()
  }

  const tick = async () => {
    if (stopped) return
    try {
      await requeueStaleIngestJobs(600)
      const slots = Math.max(1, config.INGEST_CONCURRENCY - localActive)
      const jobs = await claimIngestJobs(workerId, slots)
      await Promise.all(
        jobs.map((job) =>
          gate.run(async () => {
            await runJob(job)
          }),
        ),
      )
      backoffMs = basePollMs
    } catch (err) {
      const message = formatError(err)
      const missing =
        message.includes('claim_ingest_jobs') ||
        message.includes('does not exist') ||
        message.includes('schema cache')

      if (missing) {
        // Migration 004 not applied — stay quiet, keep polling slowly
        backoffMs = Math.min(30_000, Math.max(backoffMs, 5_000))
      } else if (isTransientNetworkError(err)) {
        backoffMs = Math.min(30_000, backoffMs * 2)
        const now = Date.now()
        if (now - lastNetworkWarnAt > 15_000) {
          lastNetworkWarnAt = now
          console.warn(`[ingest-worker] transient network error, backing off ${backoffMs}ms:`, message)
        }
      } else {
        console.error('[ingest-worker]', message)
        backoffMs = Math.min(15_000, backoffMs * 2)
      }
    } finally {
      scheduleNext(backoffMs)
    }
  }

  void tick()
  console.log(`[ingest-worker] started (${workerId}, concurrency=${config.INGEST_CONCURRENCY})`)

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
