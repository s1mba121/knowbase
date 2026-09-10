import { createClient } from '@supabase/supabase-js'
import { authRedirectTo as buildAuthRedirect } from './urls'

const url = import.meta.env.VITE_SUPABASE_URL as string
const publishable =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  ''

if (!url || !publishable) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(url ?? '', publishable)

/** Absolute app URL for Supabase Auth redirects (always current host). */
export function authRedirectTo(path = '/app'): string {
  if (typeof window === 'undefined') return path.startsWith('/') ? path : `/${path}`
  return buildAuthRedirect(window.location.origin, path)
}
