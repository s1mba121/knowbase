import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export function supabaseAsUser(accessToken: string) {
  return createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
