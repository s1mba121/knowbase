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

export { API_URL }
