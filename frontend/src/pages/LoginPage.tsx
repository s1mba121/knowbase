import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BrandMark, Button, Input } from '../components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
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

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,_#cfe8e1_0%,_#f4faf8_50%)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-sm">
        <BrandMark className="mb-6" />
        <h1 className="font-display text-3xl">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="mt-1 text-sm text-ink/60">Turn product docs into a support chatbot in minutes.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-teal-dark">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-teal hover:underline"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
        <div className="mt-6 text-xs text-ink/45">
          <Link to="/">← Marketing site</Link>
        </div>
      </div>
    </div>
  )
}
