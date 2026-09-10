import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  humanizeAuthUrlError,
  readAuthUrlError,
  stripAuthUrlError,
} from './auth-url-error.ts'

describe('readAuthUrlError', () => {
  it('parses hash errors from expired confirm links', () => {
    const href =
      'https://knowbase.example.com/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb='
    const err = readAuthUrlError(href)
    assert.ok(err)
    assert.equal(err.error, 'access_denied')
    assert.equal(err.code, 'otp_expired')
    assert.equal(err.description, 'Email link is invalid or has expired')
  })

  it('returns null when no auth error present', () => {
    assert.equal(readAuthUrlError('https://knowbase.example.com/auth'), null)
  })
})

describe('humanizeAuthUrlError', () => {
  it('explains otp_expired', () => {
    const msg = humanizeAuthUrlError({
      error: 'access_denied',
      code: 'otp_expired',
      description: 'Email link is invalid or has expired',
    })
    assert.match(msg, /expired/i)
  })
})

describe('stripAuthUrlError', () => {
  it('clears hash error params', () => {
    const next = stripAuthUrlError(
      'https://knowbase.example.com/#error=access_denied&error_code=otp_expired&sb=',
    )
    assert.equal(next, '/')
  })
})
