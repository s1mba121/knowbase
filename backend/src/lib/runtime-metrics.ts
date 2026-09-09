type LatencyBucket = { le: number; count: number }

const startedAt = Date.now()
let requestsTotal = 0
let requestsInFlight = 0
let requestsFailed = 0
const latencyMs: number[] = []
const MAX_SAMPLES = 500

const buckets: LatencyBucket[] = [
  { le: 50, count: 0 },
  { le: 100, count: 0 },
  { le: 250, count: 0 },
  { le: 500, count: 0 },
  { le: 1000, count: 0 },
  { le: 2500, count: 0 },
  { le: 5000, count: 0 },
  { le: Infinity, count: 0 },
]

let draining = false

export function markDraining(value = true) {
  draining = value
}

export function isDraining() {
  return draining
}

export function onRequestStart() {
  requestsTotal += 1
  requestsInFlight += 1
}

export function onRequestEnd(opts: { ok: boolean; durationMs: number }) {
  requestsInFlight = Math.max(0, requestsInFlight - 1)
  if (!opts.ok) requestsFailed += 1

  latencyMs.push(opts.durationMs)
  if (latencyMs.length > MAX_SAMPLES) latencyMs.shift()

  for (const b of buckets) {
    if (opts.durationMs <= b.le) {
      b.count += 1
      break
    }
  }
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx] ?? null
}

export function getRuntimeMetrics() {
  const sorted = [...latencyMs].sort((a, b) => a - b)
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    draining,
    requests: {
      total: requestsTotal,
      inFlight: requestsInFlight,
      failed: requestsFailed,
      sampleSize: sorted.length,
      latencyMs: {
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
      },
      buckets: buckets.map((b) => ({
        leMs: b.le === Infinity ? null : b.le,
        count: b.count,
      })),
    },
    process: {
      pid: process.pid,
      node: process.version,
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  }
}
