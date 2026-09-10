import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authRedirectTo, resolveApiBase } from './urls.ts'

describe('resolveApiBase', () => {
  it('uses explicit VITE_API_URL and strips trailing slash', () => {
    assert.equal(resolveApiBase('https://api.example.com/', 'production'), 'https://api.example.com')
  })

  it('defaults to localhost in development when unset', () => {
    assert.equal(resolveApiBase(undefined, 'development'), 'http://localhost:3001')
    assert.equal(resolveApiBase('  ', 'development'), 'http://localhost:3001')
  })

  it('uses same-origin empty string in production when unset', () => {
    assert.equal(resolveApiBase(undefined, 'production'), '')
    assert.equal(resolveApiBase('', 'production'), '')
  })
})

describe('authRedirectTo', () => {
  it('builds absolute redirect on current origin', () => {
    assert.equal(
      authRedirectTo('https://knowbase.example.com', '/app'),
      'https://knowbase.example.com/app',
    )
    assert.equal(
      authRedirectTo('https://knowbase.example.com/', 'reset-password'),
      'https://knowbase.example.com/reset-password',
    )
  })
})
