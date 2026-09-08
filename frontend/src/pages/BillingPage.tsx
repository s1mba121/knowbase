import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { PLANS_COPY } from '../lib/pricing'
import { Badge, Button } from '../components/ui'

export function BillingPage() {
  const { me } = useAuth()
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

  const usagePct = me
    ? Math.min(100, Math.round((me.usage.messagesUsed / Math.max(me.usage.messagesLimit, 1)) * 100))
    : 0
  const onPaid = me?.subscription.plan !== 'free'

  return (
    <div className="space-y-8">
      <div className="kb-rise max-w-lg">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Billing</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/55">
          Manage plan, usage, and your Stripe subscription.
        </p>
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
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {me ? (
        <div className="kb-rise kb-rise-1 rounded-2xl border border-line/80 bg-white/80 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/45">Current plan</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <p className="font-display text-3xl tracking-tight">{me.subscription.limits.name}</p>
                <Badge tone={onPaid ? 'ok' : 'neutral'}>{onPaid ? 'Paid' : 'Free'}</Badge>
              </div>
            </div>
            {onPaid ? (
              <Button variant="secondary" onClick={() => void portal()} disabled={busy === 'portal'}>
                {busy === 'portal' ? 'Opening…' : 'Manage in Stripe'}
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
              <div
                className="h-full rounded-full bg-teal transition-[width] duration-500"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="kb-rise kb-rise-2 grid gap-3 lg:grid-cols-3">
        {PLANS_COPY.map((plan) => {
          const current = me?.subscription.plan === plan.id
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 transition ${
                current
                  ? 'border-teal/50 bg-white shadow-[0_16px_40px_-28px_rgba(15,118,110,0.35)]'
                  : 'border-line/80 bg-white/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl tracking-tight">{plan.name}</h2>
                {current ? <Badge tone="ok">Current</Badge> : null}
              </div>
              <p className="mt-2 font-display text-3xl tracking-tight">
                ${plan.price}
                <span className="text-lg font-sans font-medium text-ink/45">/mo</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink/65">
                {plan.perks.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-teal">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.id === 'free' ? (
                  current ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={busy !== null}
                      onClick={() => void portal()}
                    >
                      {busy === 'portal' ? 'Opening…' : 'Downgrade in Stripe'}
                    </Button>
                  )
                ) : (
                  <Button
                    className="w-full"
                    disabled={current || busy !== null}
                    onClick={() => void checkout(plan.id as 'pro' | 'business')}
                  >
                    {current
                      ? 'Current plan'
                      : busy === plan.id
                        ? 'Redirecting…'
                        : plan.id === 'pro'
                          ? 'Upgrade to Pro'
                          : 'Upgrade to Business'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
