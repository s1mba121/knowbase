import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Semaphore } from '../src/lib/semaphore.js'

describe('Semaphore', () => {
  it('limits concurrent runners', async () => {
    const sem = new Semaphore(2)
    let active = 0
    let peak = 0

    const tasks = Array.from({ length: 6 }, () =>
      sem.run(async () => {
        active += 1
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 20))
        active -= 1
      }),
    )

    await Promise.all(tasks)
    assert.equal(peak, 2)
    assert.deepEqual(sem.stats, { active: 0, waiting: 0, max: 2 })
  })
})
