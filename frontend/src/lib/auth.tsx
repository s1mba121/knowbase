import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api, ApiError } from '../lib/api'
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
  const meInflight = useRef<Promise<void> | null>(null)
  const lastFetchedTokenRef = useRef<string | null>(null)

  const refreshMe = useCallback(async () => {
    if (meInflight.current) return meInflight.current

    meInflight.current = (async () => {
      try {
        const data = await api<MeResponse>('/v1/auth/me')
        setMe(data)
      } catch (err) {
        // Keep last-known profile on transient/network blips; only clear on auth failure
        if (err instanceof ApiError && err.status === 401) {
          setMe(null)
        }
      } finally {
        meInflight.current = null
      }
    })()

    return meInflight.current
  }, [])

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') {
        setMe(null)
        lastFetchedTokenRef.current = null
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const accessToken = session?.access_token ?? null

  useEffect(() => {
    if (!accessToken) {
      lastFetchedTokenRef.current = null
      setMe(null)
      return
    }
    if (window.location.pathname === '/reset-password') return
    // Same JWT already fetched → skip (getSession + INITIAL_SESSION / Strict Mode)
    if (lastFetchedTokenRef.current === accessToken) return
    lastFetchedTokenRef.current = accessToken
    void refreshMe()
  }, [accessToken, refreshMe])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setMe(null)
    lastFetchedTokenRef.current = null
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
