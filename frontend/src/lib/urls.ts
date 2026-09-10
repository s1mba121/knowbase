/** URL helpers without Vite/DOM coupling (unit-tested). */

export function resolveApiBase(
  viteApiUrl: string | undefined,
  mode: 'development' | 'production' | string,
): string {
  const raw = viteApiUrl?.trim()
  if (raw) return raw.replace(/\/$/, '')
  if (mode === 'development') return 'http://localhost:3001'
  return ''
}

export function authRedirectTo(origin: string, path = '/app'): string {
  const base = origin.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
