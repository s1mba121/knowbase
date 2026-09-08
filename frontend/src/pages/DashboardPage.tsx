import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Bot } from '../lib/types'
import { Button, EmptyState, Input } from '../components/ui'

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Your chatbots</h1>
          <p className="mt-1 text-sm text-ink/60">Upload docs, test answers, embed on your site.</p>
        </div>
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
          <Input
            label="New bot name"
            placeholder="Acme Docs Assistant"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create bot'}
          </Button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : bots.length === 0 ? (
        <EmptyState
          title="No bots yet"
          body="Create your first bot, upload a Markdown or PDF help article, then try the playground."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bots.map((bot) => (
            <Link
              key={bot.id}
              to={`/app/bots/${bot.id}`}
              className="rounded-2xl border border-line bg-white/80 p-5 transition hover:border-teal/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{bot.name}</h2>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: bot.primary_color }}
                  title={bot.primary_color}
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink/55">{bot.welcome_message}</p>
              <p className="mt-4 text-xs font-medium text-teal">
                {bot.is_published ? 'Published' : 'Draft'} →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
