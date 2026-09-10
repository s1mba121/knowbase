import assert from 'node:assert/strict'
import test from 'node:test'
import type { FastifyRequest } from 'fastify'
import {
  apiPublicOrigin,
  appPublicOrigin,
  isTrustedAppOrigin,
  requestPublicOrigin,
} from '../src/lib/public-url.js'

function fakeReq(headers: Record<string, string>): FastifyRequest {
  return { headers, protocol: 'http' } as FastifyRequest
}

test('requestPublicOrigin uses forwarded headers', () => {
  const origin = requestPublicOrigin(
    fakeReq({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'knowbase.example.com',
      host: 'api:3001',
    }),
  )
  assert.equal(origin, 'https://knowbase.example.com')
})

test('apiPublicOrigin falls back to request origin', () => {
  const origin = apiPublicOrigin(
    fakeReq({
      'x-forwarded-proto': 'https',
      host: 'app.example.com',
    }),
  )
  assert.equal(origin, 'https://app.example.com')
})

test('appPublicOrigin prefers Origin header when FRONTEND_URL empty', () => {
  const origin = appPublicOrigin(
    fakeReq({
      origin: 'https://app.example.com',
      host: 'api:3001',
    }),
  )
  assert.equal(origin, 'https://app.example.com')
})

test('isTrustedAppOrigin allows same public host', () => {
  const req = fakeReq({
    'x-forwarded-host': 'knowbase.example.com',
    'x-forwarded-proto': 'https',
  })
  assert.equal(isTrustedAppOrigin('https://knowbase.example.com', req), true)
  assert.equal(isTrustedAppOrigin('https://evil.example.com', req), false)
  assert.equal(isTrustedAppOrigin('http://localhost:8080', req), true)
})
