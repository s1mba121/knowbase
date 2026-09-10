/** Parse Supabase Auth errors from URL hash/query (e.g. expired confirm link). */

export type AuthUrlError = {
  error: string | null
  code: string | null
  description: string | null
}

export function readAuthUrlError(href: string = typeof window !== 'undefined' ? window.location.href : ''): AuthUrlError | null {
  if (!href) return null
  const url = new URL(href)
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const q = url.searchParams

  const error = hash.get('error') ?? q.get('error')
  const code = hash.get('error_code') ?? q.get('error_code')
  const rawDescription = hash.get('error_description') ?? q.get('error_description')
  const description = rawDescription?.replace(/\+/g, ' ') ?? null

  if (!error && !code && !description) return null
  return { error, code, description }
}

export function humanizeAuthUrlError(err: AuthUrlError): string {
  if (err.code === 'otp_expired' || /invalid or has expired/i.test(err.description ?? '')) {
    return 'This email link is invalid or has expired. Please sign in, or sign up again to get a new confirmation email.'
  }
  if (err.code === 'access_denied' || err.error === 'access_denied') {
    return err.description || 'Access denied. Please try signing in again.'
  }
  return err.description || err.error || 'Authentication failed. Please try again.'
}

/** Drop auth error params from the current URL (keeps path; clears hash if only auth noise). */
export function stripAuthUrlError(href: string): string {
  const url = new URL(href)
  for (const key of ['error', 'error_code', 'error_description', 'sb']) {
    url.searchParams.delete(key)
  }
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  for (const key of ['error', 'error_code', 'error_description', 'sb']) {
    hash.delete(key)
  }
  const nextHash = hash.toString()
  url.hash = nextHash ? `#${nextHash}` : ''
  return `${url.pathname}${url.search}${url.hash}`
}
