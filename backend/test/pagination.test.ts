import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clampLimit, pageFromRows } from '../src/lib/pagination.js'

describe('clampLimit', () => {
  it('clamps to max and falls back', () => {
    assert.equal(clampLimit(10, 50, 100), 10)
    assert.equal(clampLimit(999, 50, 100), 100)
    assert.equal(clampLimit('nope', 50, 100), 50)
    assert.equal(clampLimit(0, 50, 100), 50)
    assert.equal(clampLimit(-3, 50, 100), 50)
    assert.equal(clampLimit('25', 50, 100), 25)
  })
})

describe('pageFromRows', () => {
  it('returns all rows when under limit', () => {
    const page = pageFromRows([1, 2, 3], 5)
    assert.deepEqual(page.items, [1, 2, 3])
    assert.equal(page.next_cursor, null)
  })

  it('trims overflow page', () => {
    const page = pageFromRows(['a', 'b', 'c', 'd'], 3)
    assert.deepEqual(page.items, ['a', 'b', 'c'])
    assert.equal(page.next_cursor, null)
  })
})
