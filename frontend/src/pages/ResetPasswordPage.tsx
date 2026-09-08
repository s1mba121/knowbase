import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthShell } from '../components/AuthShell'
import { Button, Input } from '../components/ui'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!cancelled && data.session) {
        setHasSession(true)
        setReady(true)
        return
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
          setHasSession(true)
          setReady(true)
        }
      })

      // Give the client a moment to parse recovery tokens from the URL
      window.setTimeout(() => {
        if (!cancelled) setReady(true)
      }, 1200)

      return () => sub.subscription.unsubscribe()
    }

    const cleanupPromise = init()
    return () => {
      cancelled = true
      void cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      window.setTimeout(() => navigate('/app'), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {!ready ? (
        <p className="text-sm text-ink/50">Verifying reset link…</p>
      ) : !hasSession ? (
        <div>
          <h1 className="font-display text-[2.15rem] leading-[1.15] tracking-tight text-ink">
            Link expired or invalid
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/55">
            Request a new password reset from the sign-in page.
          </p>
          <Link to="/auth?mode=forgot" className="mt-8 inline-block">
            <Button className="px-5 py-3">Request new link</Button>
          </Link>
        </div>
      ) : done ? (
        <div>
          <h1 className="font-display text-[2.15rem] leading-[1.15] tracking-tight text-ink">
            Password updated
          </h1>
          <p className="mt-3 text-[15px] text-ink/55">Redirecting to your dashboard…</p>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-[2.15rem] leading-[1.15] tracking-tight text-ink sm:text-[2.4rem]">
            Choose a new password
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/55">
            Enter a new password for your Knowbase account.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="mt-2 w-full py-3" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </div>
      )}
    </AuthShell>
  )
}
