/**
 * Limits concurrent document ingest jobs in this process so PDF/embed work
 * does not starve chat request handlers under upload spikes.
 */
const MAX_CONCURRENT = 2

let active = 0
const waiting: Array<() => void> = []

function pump() {
  while (active < MAX_CONCURRENT && waiting.length > 0) {
    const next = waiting.shift()
    if (next) next()
  }
}

export function scheduleIngest(task: () => Promise<void>): void {
  const start = () => {
    active += 1
    void task()
      .catch((err) => {
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
