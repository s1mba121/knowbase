import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Bot } from '../lib/types'
import { Badge, Button, Input } from '../components/ui'

function CreateBotForm({
  name,
  setName,
  creating,
  onCreate,
  className = '',
}: {
  name: string
  setName: (v: string) => void
  creating: boolean
  onCreate: (e: FormEvent) => void
  className?: string
}) {
  return (
    <form onSubmit={onCreate} className={`flex flex-wrap items-end gap-2 ${className}`}>
      <Input
        label="New bot name"
        placeholder="Acme Docs Assistant"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="min-w-[220px] sm:min-w-[260px]"
      />
      <Button type="submit" disabled={creating || !name.trim()} className="shrink-0">
        {creating ? 'Creating…' : 'Create bot'}
      </Button>
    </form>
  )
}

export function DashboardPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api<Bot[]>('/v1/bots')
      setBots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bots')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const bot = await api<Bot>('/v1/bots', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      setName('')
      setBots((prev) => [bot, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot')
    } finally {
      setCreating(false)
    }
  }

  const createFormProps = { name, setName, creating, onCreate }

  return (
    <div className="space-y-8">
      <div className="kb-rise flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-lg">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Your chatbots</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/55">
            Upload docs, test answers, embed on your site.
          </p>
        </div>
        {!loading && bots.length > 0 ? <CreateBotForm {...createFormProps} /> : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[148px] animate-pulse rounded-2xl border border-line/60 bg-white/50"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      ) : bots.length === 0 ? (
        <div className="kb-rise kb-rise-1 rounded-2xl border border-line/70 bg-white/70 px-6 py-12 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-md text-center">
            <h2 className="font-display text-2xl tracking-tight">Create your first bot</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">
              Name it, upload a help article, try the playground, then embed the widget.
            </p>
            <CreateBotForm {...createFormProps} className="mt-8 justify-center text-left" />
          </div>
        </div>
      ) : (
        <div className="kb-rise kb-rise-1 grid gap-3 sm:grid-cols-2">
          {bots.map((bot) => (
            <Link
              key={bot.id}
              to={`/app/bots/${bot.id}`}
              className="group rounded-2xl border border-line/80 bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-teal/35 hover:bg-white hover:shadow-[0_16px_40px_-28px_rgba(15,118,110,0.45)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                      style={{ background: bot.primary_color }}
                      title={bot.primary_color}
                    />
                    <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{bot.name}</h2>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/55">{bot.welcome_message}</p>
                </div>
                <Badge tone={bot.is_published ? 'ok' : 'warn'}>
                  {bot.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="mt-5 text-xs font-semibold text-teal transition group-hover:text-teal-dark">
                Open →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
