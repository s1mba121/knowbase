import type { FastifyRequest } from 'fastify'
import { config } from '../config.js'

const LOCAL_APP_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.split(',')[0]?.trim() || undefined
}

/** Host the client used to reach us (Cloudflare / nginx → X-Forwarded-Host). */
export function requestPublicHost(request: FastifyRequest): string | undefined {
  return (
    firstHeader(request.headers['x-forwarded-host']) ||
    firstHeader(request.headers.host)
  )
}

/** Public origin of this API hop (proto + host), derived from proxy headers. */
export function requestPublicOrigin(request: FastifyRequest): string {
  const host = requestPublicHost(request)
  if (!host) return config.BACKEND_URL || 'http://localhost:3001'
  const proto =
    firstHeader(request.headers['x-forwarded-proto']) ||
    (request.protocol === 'https' ? 'https' : 'http')
  return `${proto}://${host}`
}

/** Browser-facing API base for widget.js / data-api (env override or request). */
export function apiPublicOrigin(request: FastifyRequest): string {
  const fromEnv = config.BACKEND_URL.replace(/\/$/, '')
  // Never bake localhost into production embed snippets.
  if (fromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(fromEnv)) {
    return fromEnv
  }
  return requestPublicOrigin(request).replace(/\/$/, '')
}

/** App UI origin for Stripe redirects / SSE (env, Origin header, or request). */
export function appPublicOrigin(request: FastifyRequest): string {
  if (config.FRONTEND_URL) return config.FRONTEND_URL.replace(/\/$/, '')
  const origin = request.headers.origin
  if (typeof origin === 'string' && origin.length > 0) return origin.replace(/\/$/, '')
  return requestPublicOrigin(request).replace(/\/$/, '')
}

export function configuredAppOrigins(): string[] {
  const fromEnv = config.APP_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const primary = config.FRONTEND_URL ? [config.FRONTEND_URL.replace(/\/$/, '')] : []
  return [...new Set([...LOCAL_APP_ORIGINS, ...primary, ...fromEnv])]
}

/** Whether this browser Origin may call authenticated app APIs with credentials. */
export function isTrustedAppOrigin(origin: string | undefined, request: FastifyRequest): boolean {
  if (!origin) return true
  if (configuredAppOrigins().includes(origin)) return true

  try {
    const originHost = new URL(origin).host
    const publicHost = requestPublicHost(request)
    if (publicHost && originHost === publicHost) return true
  } catch {
    return false
  }
  return false
}
