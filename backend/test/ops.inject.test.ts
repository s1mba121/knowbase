/**
 * Ops endpoints smoke (no auth). Loads real config from backend/.env.
 */
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('ops endpoints', async () => {
  let app: Awaited<ReturnType<typeof import('../src/app.js').buildApp>>

  before(async () => {
    const mod = await import('../src/app.js')
    app = await mod.buildApp()
  })

  after(async () => {
    await app.close()
    const { closeRedis } = await import('../src/lib/redis.js')
    await closeRedis()
  })

  it('GET /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().ok, true)
    assert.ok(res.headers['x-request-id'])
  })

  it('GET /ready', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' })
    assert.equal(res.statusCode, 200)
  })

  it('GET /metrics includes ingest + openaiGate', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.ok(body.ingest)
    assert.ok(body.openaiGate)
    assert.ok(body.requests)
  })

  it('echoes x-request-id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'test-req-123' },
    })
    assert.equal(res.headers['x-request-id'], 'test-req-123')
  })
})
