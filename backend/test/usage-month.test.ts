import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { currentMonthKey } from '../src/lib/month.js'

describe('currentMonthKey', () => {
  it('formats UTC year-month with zero padding', () => {
    assert.equal(currentMonthKey(new Date(Date.UTC(2026, 0, 15))), '2026-01')
    assert.equal(currentMonthKey(new Date(Date.UTC(2026, 8, 10))), '2026-09')
  })
})
