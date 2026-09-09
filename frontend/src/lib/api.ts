import { supabase } from './supabase'

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function api<T>(
  path: string,
  options: RequestInit & { formData?: FormData } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const auth = await authHeader()
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v))

  let body = options.body
  if (options.formData) {
    body = options.formData
  } else if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body,
  }).catch(() => {
    throw new ApiError(503, 'Network error — please retry')
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText || 'Request failed'
    throw new ApiError(res.status, message)
  }
  return data as T
}

/** Accept either a bare array or `{ items, next_cursor }` page payloads. */
export function unwrapPage<T>(data: T[] | { items: T[]; next_cursor?: string | null }): T[] {
  return Array.isArray(data) ? data : data.items
}

export type ChatStreamEvent =
  | { type: 'meta'; conversation_id: string; sources: unknown }
  | { type: 'token'; content: string }
  | { type: 'done'; answer: string }
  | { type: 'error'; error: string; status?: number }

export async function streamChat(
  path: string,
  body: unknown,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const auth = await authHeader()
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v))

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    let message = res.statusText || 'Stream failed'
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        onEvent(JSON.parse(payload) as ChatStreamEvent)
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

export { API_URL }
