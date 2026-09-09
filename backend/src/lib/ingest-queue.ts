/**
 * Limits concurrent document ingest jobs in this process so PDF/embed work
 * does not starve chat request handlers under upload spikes.
 */
const MAX_CONCURRENT = 2
/** Reject new uploads when the backlog is this deep (backpressure). */
export const INGEST_MAX_QUEUED = 20

let active = 0
const waiting: Array<() => void> = []
let completed = 0
let failed = 0

function pump() {
  while (active < MAX_CONCURRENT && waiting.length > 0) {
    const next = waiting.shift()
    if (next) next()
  }
}

export function getIngestStats() {
  return {
    active,
    queued: waiting.length,
    maxConcurrent: MAX_CONCURRENT,
    maxQueued: INGEST_MAX_QUEUED,
    completed,
    failed,
  }
}

export function canAcceptIngest(): boolean {
  return waiting.length < INGEST_MAX_QUEUED
}

export function scheduleIngest(task: () => Promise<void>): void {
  if (!canAcceptIngest()) {
    throw Object.assign(new Error('Ingest queue is full. Retry shortly.'), {
      statusCode: 503,
      code: 'INGEST_BACKPRESSURE',
    })
  }

  const start = () => {
    active += 1
    void task()
      .then(() => {
        completed += 1
      })
      .catch((err) => {
        failed += 1
        console.error('[ingest]', err instanceof Error ? err.message : err)
      })
      .finally(() => {
        active -= 1
        pump()
      })
  }

  if (active < MAX_CONCURRENT) {
    start()
  } else {
    waiting.push(start)
  }
}
