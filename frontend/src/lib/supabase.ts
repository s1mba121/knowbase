import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const publishable =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  ''

if (!url || !publishable) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(url ?? '', publishable)
