import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { PLANS_COPY } from '../lib/pricing'
import type { PlanId } from '../lib/types'
import { Button } from '../components/ui'

export function BillingPage() {
  const { me, refreshMe } = useAuth()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function checkout(plan: 'pro' | 'business') {
    setBusy(plan)
    setError(null)
    try {
      const { url } = await api<{ url: string }>('/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(null)
    }
  }

  async function portal() {
    setBusy('portal')
    setError(null)
    try {
      const { url } = await api<{ url: string }>('/v1/billing/portal', { method: 'POST' })
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal failed')
    } finally {
      setBusy(null)
    }
  }

  async function demoPlan(plan: PlanId) {
    setBusy(plan)
    setError(null)
    try {
      await api('/v1/billing/demo-plan', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      await refreshMe()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set demo plan')
    } finally {
      setBusy(null)
    }
  }

  const usagePct = me
    ? Math.min(100, Math.round((me.usage.messagesUsed / Math.max(me.usage.messagesLimit, 1)) * 100))
    : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Billing</h1>
        <p className="mt-1 text-sm text-ink/60">Manage plan, usage, and Stripe subscription.</p>
      </div>

      {params.get('success') ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscription updated. It may take a few seconds for webhooks to sync.
        </p>
      ) : null}
      {params.get('canceled') ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout canceled.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {me ? (
        <div className="rounded-2xl border border-line bg-white/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink/55">Current plan</p>
              <p className="font-display text-3xl">{me.subscription.limits.name}</p>
            </div>
            {me.subscription.plan !== 'free' ? (
              <Button variant="secondary" onClick={() => void portal()} disabled={busy === 'portal'}>
                Manage in Stripe
              </Button>
            ) : null}
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-ink/55">
              <span>Messages this month</span>
              <span>
                {me.usage.messagesUsed} / {me.usage.messagesLimit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-teal" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS_COPY.map((plan) => {
          const current = me?.subscription.plan === plan.id
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 ${current ? 'border-teal bg-white' : 'border-line bg-white/70'}`}
            >
              <h2 className="font-display text-2xl">{plan.name}</h2>
              <p className="mt-2 font-display text-3xl">${plan.price}/mo</p>
              <ul className="mt-4 space-y-1 text-sm text-ink/65">
                {plan.perks.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              <div className="mt-5 space-y-2">
                {plan.id === 'free' ? (
                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={current || busy !== null}
                    onClick={() => void demoPlan('free')}
                  >
                    {current ? 'Current plan' : 'Switch to Free (demo)'}
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      disabled={current || busy !== null}
                      onClick={() => void checkout(plan.id as 'pro' | 'business')}
                    >
                      {current ? 'Current plan' : busy === plan.id ? 'Redirecting…' : `Upgrade via Stripe`}
                    </Button>
                    <Button
                      className="w-full"
                      variant="ghost"
                      disabled={current || busy !== null}
                      onClick={() => void demoPlan(plan.id as PlanId)}
                    >
                      Simulate plan (demo)
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
