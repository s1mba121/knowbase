import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultIsRetryable, withRetry } from '../src/lib/retry.js'

describe('withRetry', () => {
  it('retries retryable errors then succeeds', async () => {
    let attempts = 0
    const value = await withRetry(
      async () => {
        attempts += 1
        if (attempts < 3) {
          throw Object.assign(new Error('rate limit'), { status: 429 })
        }
        return 'ok'
      },
      { retries: 3, baseDelayMs: 1 },
    )
    assert.equal(value, 'ok')
    assert.equal(attempts, 3)
  })

  it('does not retry non-retryable errors', async () => {
    let attempts = 0
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            attempts += 1
            throw Object.assign(new Error('bad request'), { status: 400 })
          },
          { retries: 3, baseDelayMs: 1 },
        ),
      /bad request/,
    )
    assert.equal(attempts, 1)
  })

  it('classifies 429 and 5xx as retryable', () => {
    assert.equal(defaultIsRetryable({ status: 429 }), true)
    assert.equal(defaultIsRetryable({ status: 503 }), true)
    assert.equal(defaultIsRetryable({ status: 400 }), false)
  })
})
