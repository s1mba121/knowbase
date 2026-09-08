import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import type { MeResponse } from '../lib/types'

type AuthState = {
  session: Session | null
  user: User | null
  me: MeResponse | null
  loading: boolean
  refreshMe: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const data = await api<MeResponse>('/v1/auth/me')
      setMe(data)
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      // Avoid hammering /me during recovery before password is set
      if (event === 'PASSWORD_RECOVERY') {
        setMe(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      // Skip profile fetch on recovery-only pages until user finishes reset
      if (window.location.pathname === '/reset-password') return
      void refreshMe()
    } else {
      setMe(null)
    }
  }, [session, refreshMe])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setMe(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      me,
      loading,
      refreshMe,
      signOut,
    }),
    [session, me, loading, refreshMe, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
