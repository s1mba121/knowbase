/** Human-readable error for logs (avoids `[object Object]`). */
export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; error?: unknown; details?: unknown; code?: unknown }
    if (typeof o.message === 'string' && o.message) return o.message
    if (typeof o.error === 'string' && o.error) return o.error
    try {
      return JSON.stringify(err)
    } catch {
      return 'Unknown error'
    }
  }
  return String(err)
}

export function isTransientNetworkError(err: unknown): boolean {
  const msg = formatError(err).toLowerCase()
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('eai_again') ||
    msg.includes('socket hang up')
  )
}
