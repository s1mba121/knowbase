import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, API_URL } from '../lib/api'
import type { Bot, DocumentRow } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Badge, Button, Input, TextArea } from '../components/ui'
import { ChatPanel } from '../components/ChatPanel'

type Tab = 'docs' | 'chat' | 'embed' | 'settings'

export function BotDetailPage() {
  const { botId = '' } = useParams()
  const { me, refreshMe } = useAuth()
  const [bot, setBot] = useState<Bot | null>(null)
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [tab, setTab] = useState<Tab>('docs')
  const [error, setError] = useState<string | null>(null)
  const [snippet, setSnippet] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [b, d, embed] = await Promise.all([
        api<Bot>(`/v1/bots/${botId}`),
        api<DocumentRow[]>(`/v1/bots/${botId}/documents`),
        api<{ snippet: string }>(`/v1/bots/${botId}/embed`),
      ])
      setBot(b)
      setDocs(d)
      setSnippet(embed.snippet)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bot')
    }
  }

  useEffect(() => {
    void load()
  }, [botId])

  async function onUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api(`/v1/bots/${botId}/documents`, { method: 'POST', formData: fd })
      await load()
      await refreshMe()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function removeDoc(id: string) {
    await api(`/v1/bots/${botId}/documents/${id}`, { method: 'DELETE' })
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!bot) return
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      const updated = await api<Bot>(`/v1/bots/${botId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          welcome_message: form.get('welcome_message'),
          primary_color: form.get('primary_color'),
          system_prompt: form.get('system_prompt'),
          is_published: form.get('is_published') === 'on',
        }),
      })
      setBot(updated)
      const embed = await api<{ snippet: string }>(`/v1/bots/${botId}/embed`)
      setSnippet(embed.snippet)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deleteBot() {
    if (!confirm('Delete this bot and all documents?')) return
    await api(`/v1/bots/${botId}`, { method: 'DELETE' })
    window.location.href = '/app'
  }

  if (!bot) {
    return <p className="text-sm text-ink/50">{error ?? 'Loading…'}</p>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'docs', label: 'Documents' },
    { id: 'chat', label: 'Playground' },
    { id: 'embed', label: 'Embed' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link to="/app" className="text-xs text-ink/50 hover:text-ink">
          ← All bots
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl">{bot.name}</h1>
          <Badge tone={bot.is_published ? 'ok' : 'neutral'}>
            {bot.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-white/70 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-teal text-white' : 'text-ink/70 hover:bg-mist'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tab === 'docs' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white/80 p-5">
            <h2 className="font-semibold">Upload knowledge</h2>
            <p className="mt-1 text-sm text-ink/55">PDF, TXT, or Markdown. Processing starts immediately.</p>
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,text/plain,application/pdf"
              className="mt-4 block w-full text-sm"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onUpload(f)
              }}
            />
            {uploading ? <p className="mt-2 text-xs text-ink/50">Uploading & embedding…</p> : null}
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-mist/50 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-line/70">
                    <td className="px-4 py-3 font-medium">{d.filename}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          d.status === 'ready' ? 'ok' : d.status === 'failed' ? 'bad' : 'warn'
                        }
                      >
                        {d.status}
                      </Badge>
                      {d.error_message ? (
                        <span className="ml-2 text-xs text-red-600">{d.error_message}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink/60">{(d.bytes / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => void removeDoc(d.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink/45">
                      No documents yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'chat' ? <ChatPanel botId={botId} /> : null}

      {tab === 'embed' ? (
        <div className="space-y-4 rounded-2xl border border-line bg-white/80 p-6">
          <h2 className="font-semibold">Embed on your website</h2>
          <p className="text-sm text-ink/60">
            Publish the bot in Settings, then paste this snippet before <code>&lt;/body&gt;</code>.
            {me?.subscription.limits.watermark
              ? ' Free plan shows a small Knowbase watermark.'
              : ' No watermark on your plan.'}
          </p>
          <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-xs text-emerald-100">{snippet}</pre>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void navigator.clipboard.writeText(snippet)}
          >
            Copy snippet
          </Button>
          <p className="text-xs text-ink/45">
            Widget script URL: {API_URL}/widget.js · public key: {bot.public_key}
          </p>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <form onSubmit={saveSettings} className="space-y-4 rounded-2xl border border-line bg-white/80 p-6">
          <Input label="Name" name="name" defaultValue={bot.name} required />
          <Input
            label="Welcome message"
            name="welcome_message"
            defaultValue={bot.welcome_message}
            required
          />
          <Input
            label={`Primary color${me?.subscription.limits.branding ? '' : ' (Pro+)'} `}
            name="primary_color"
            type="color"
            defaultValue={bot.primary_color}
            className="h-11 w-24 p-1"
          />
          <TextArea
            label="System prompt"
            name="system_prompt"
            rows={5}
            defaultValue={bot.system_prompt}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={bot.is_published} />
            Published (required for the embed widget)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
            <Button type="button" variant="danger" onClick={() => void deleteBot()}>
              Delete bot
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
