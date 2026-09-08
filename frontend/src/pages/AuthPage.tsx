import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AuthShell } from '../components/AuthShell'
import { Button, Input } from '../components/ui'

type AuthMode = 'login' | 'signup' | 'forgot'

export function AuthPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
    if (params.get('mode') === 'forgot') setMode('forgot')
  }, [])

  if (!loading && session && mode !== 'forgot') {
    return <Navigate to="/app" replace />
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}/reset-password`
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (err) throw err
        setInfo('Check your email for a reset link. It may take a minute to arrive.')
        return
      }

      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/app')
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.session) {
          navigate('/app')
        } else {
          setInfo('Check your email to confirm your account, then sign in.')
          setMode('login')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode === 'forgot'
      ? 'Reset your password'
      : mode === 'login'
        ? 'Sign in to Knowbase'
        : 'Create your Knowbase'

  const subtitle =
    mode === 'forgot'
      ? 'Enter your email and we’ll send a secure reset link.'
      : mode === 'login'
        ? 'Access your bots, docs, and embed settings.'
        : 'Start free — one bot, cited answers, embeddable widget.'

  return (
    <AuthShell>
      <div key={mode} className="kb-auth-copy">
        <h1 className="font-display text-[2.15rem] leading-[1.15] tracking-tight text-ink sm:text-[2.4rem]">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/55">{subtitle}</p>
      </div>

      {mode !== 'forgot' ? (
        <div className="kb-auth-toggle mt-8" role="tablist" aria-label="Authentication mode">
          <span
            aria-hidden
            className={`kb-auth-toggle-thumb ${mode === 'signup' ? 'is-signup' : ''}`}
          />
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`kb-auth-toggle-btn ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`kb-auth-toggle-btn ${mode === 'signup' ? 'is-active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>
      ) : null}

      <form className="mt-7 space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== 'forgot' ? (
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'login' ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-teal hover:underline"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-teal-dark">{info}</p> : null}
        <Button type="submit" className="mt-2 w-full py-3" disabled={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'forgot'
              ? 'Send reset link'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
        </Button>
      </form>

      {mode === 'forgot' ? (
        <p className="mt-6 text-sm text-ink/50">
          Remembered it?{' '}
          <button
            type="button"
            className="font-semibold text-teal hover:underline"
            onClick={() => switchMode('login')}
          >
            Back to sign in
          </button>
        </p>
      ) : (
        <>
          <ul className="mt-10 space-y-4 border-t border-line/70 pt-8">
            {[
              ['Upload knowledge', 'PDF, Markdown, or TXT from your docs'],
              ['Cited answers', 'Every reply can point to a source chunk'],
              ['Embed anywhere', 'One script tag for your website'],
            ].map(([t, body]) => (
              <li key={t} className="flex gap-3.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                <div>
                  <p className="text-sm font-semibold text-ink">{t}</p>
                  <p className="mt-0.5 text-sm text-ink/50">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-ink/40">Free plan · 1 bot · 100 messages / month</p>
        </>
      )}
    </AuthShell>
  )
}
