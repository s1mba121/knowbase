/** Retry transient upstream failures (OpenAI 429/5xx, network blips). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries?: number
    baseDelayMs?: number
    label?: string
    isRetryable?: (err: unknown) => boolean
  } = {},
): Promise<T> {
  const retries = opts.retries ?? 3
  const baseDelayMs = opts.baseDelayMs ?? 400
  const isRetryable = opts.isRetryable ?? defaultIsRetryable

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt >= retries || !isRetryable(err)) throw err
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 100)
      console.warn(
        `[retry] ${opts.label ?? 'op'} attempt ${attempt + 1}/${retries} in ${delay}ms`,
        err instanceof Error ? err.message : err,
      )
      await sleep(delay)
    }
  }
  throw lastErr
}

export function defaultIsRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    status?: number
    statusCode?: number
    code?: string
    message?: string
  }
  const status = e.status ?? e.statusCode
  if (status === 429 || status === 408) return true
  if (typeof status === 'number' && status >= 500) return true
  if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET' || e.code === 'EAI_AGAIN') return true
  const msg = (e.message || '').toLowerCase()
  return msg.includes('rate limit') || msg.includes('timeout') || msg.includes('temporarily')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
