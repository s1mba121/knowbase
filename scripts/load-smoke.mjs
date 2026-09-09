#!/usr/bin/env node
/**
 * Lightweight concurrency smoke against /health and /metrics.
 * Usage: node scripts/load-smoke.mjs [baseUrl] [concurrency] [requests]
 * Example: node scripts/load-smoke.mjs http://localhost:3001 40 200
 */
const base = process.argv[2] || 'http://localhost:3001'
const concurrency = Number(process.argv[3] || 40)
const total = Number(process.argv[4] || 200)

async function one(path) {
  const t0 = performance.now()
  const res = await fetch(`${base}${path}`)
  const ms = performance.now() - t0
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return ms
}

function pct(sorted, p) {
  if (!sorted.length) return null
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]
}

async function runPool(paths) {
  const latencies = []
  let i = 0
  let failed = 0

  async function worker() {
    while (i < total) {
      const n = i++
      const path = paths[n % paths.length]
      try {
        latencies.push(await one(path))
      } catch {
        failed += 1
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return { latencies, failed }
}

const started = performance.now()
const { latencies, failed } = await runPool(['/health', '/ready', '/metrics'])
const sorted = [...latencies].sort((a, b) => a - b)
const elapsed = performance.now() - started

console.log(
  JSON.stringify(
    {
      base,
      concurrency,
      total,
      ok: latencies.length,
      failed,
      elapsedMs: Math.round(elapsed),
      rps: Number(((latencies.length / elapsed) * 1000).toFixed(1)),
      latencyMs: {
        p50: pct(sorted, 50) != null ? Math.round(pct(sorted, 50)) : null,
        p95: pct(sorted, 95) != null ? Math.round(pct(sorted, 95)) : null,
        p99: pct(sorted, 99) != null ? Math.round(pct(sorted, 99)) : null,
      },
    },
    null,
    2,
  ),
)

if (failed > 0) process.exitCode = 1
