import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatError, isTransientNetworkError } from '../src/lib/errors.js'

describe('formatError', () => {
  it('reads message from plain objects', () => {
    assert.equal(formatError({ message: 'fetch failed' }), 'fetch failed')
    assert.notEqual(formatError({ message: 'fetch failed' }), '[object Object]')
  })

  it('detects transient network errors', () => {
    assert.equal(isTransientNetworkError(new TypeError('fetch failed')), true)
    assert.equal(isTransientNetworkError({ message: 'Invalid JWT' }), false)
  })
})
