import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TtlCache } from '../src/lib/ttl-cache.js'

describe('TtlCache', () => {
  it('stores and returns values within TTL', () => {
    const cache = new TtlCache<string>(60_000)
    cache.set('a', 'one')
    assert.equal(cache.get('a'), 'one')
  })

  it('expires values after TTL', async () => {
    const cache = new TtlCache<string>(20)
    cache.set('a', 'one')
    await new Promise((r) => setTimeout(r, 40))
    assert.equal(cache.get('a'), undefined)
  })

  it('evicts oldest when over capacity', () => {
    const cache = new TtlCache<number>(60_000, 2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    assert.equal(cache.get('a'), undefined)
    assert.equal(cache.get('b'), 2)
    assert.equal(cache.get('c'), 3)
  })

  it('deleteWhere removes matching keys', () => {
    const cache = new TtlCache<string>(60_000)
    cache.set('bot:1', 'x')
    cache.set('bot:2', 'y')
    cache.set('user:1', 'z')
    cache.deleteWhere((k) => k.startsWith('bot:'))
    assert.equal(cache.get('bot:1'), undefined)
    assert.equal(cache.get('user:1'), 'z')
  })
})
