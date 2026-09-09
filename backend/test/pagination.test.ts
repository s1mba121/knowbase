import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clampLimit } from '../src/lib/pagination.js'

describe('clampLimit', () => {
  it('clamps to max and falls back', () => {
    assert.equal(clampLimit(10, 50, 100), 10)
    assert.equal(clampLimit(999, 50, 100), 100)
    assert.equal(clampLimit('nope', 50, 100), 50)
    assert.equal(clampLimit(0, 50, 100), 50)
  })
})
