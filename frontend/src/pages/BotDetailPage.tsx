import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, API_URL } from '../lib/api'
import type { Bot, DocumentRow } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Badge, Button, Input, TextArea } from '../components/ui'
import { ChatPanel } from '../components/ChatPanel'
import { DropZone } from '../components/DropZone'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { getErrorMessage, isPlanLimitError, PlanLimitNotice } from '../components/PlanLimitNotice'

type Tab = 'docs' | 'chat' | 'embed' | 'settings'

type PendingDelete =
  | { type: 'doc'; id: string; name: string }
  | { type: 'bot' }
  | null

export function BotDetailPage() {
  const { botId = '' } = useParams()
  const { me, refreshMe } = useAuth()
  const toast = useToast()
  const [bot, setBot] = useState<Bot | null>(null)
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [tab, setTab] = useState<Tab>('docs')
  const [error, setError] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [snippet, setSnippet] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

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
      setError(getErrorMessage(err, 'Failed to load bot'))
    }
  }

  useEffect(() => {
    void load()
  }, [botId])

  async function onUpload(file: File) {
    setUploading(true)
    setError(null)
    setLimitError(null)
    const toastId = toast.info('Uploading…', file.name, { id: `upload-${file.name}` })
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api(`/v1/bots/${botId}/documents`, { method: 'POST', formData: fd })
      await load()
      await refreshMe()
      toast.dismiss(toastId)
      toast.success('Uploaded', `${file.name} is ready in your knowledge base.`)
    } catch (err) {
      const message = getErrorMessage(err, 'Upload failed')
      toast.dismiss(toastId)
      if (isPlanLimitError(err)) {
        setLimitError(message)
        toast.error('Plan limit', message)
      } else {
        setError(message)
        toast.error('Upload failed', message)
      }
    } finally {
      setUploading(false)
    }
  }

  async function removeDoc(id: string, name: string) {
    setDeleting(true)
    try {
      await api(`/v1/bots/${botId}/documents/${id}`, { method: 'DELETE' })
      setDocs((prev) => prev.filter((d) => d.id !== id))
      setPendingDelete(null)
      toast.success('Deleted', name)
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err, 'Could not delete document'))
    } finally {
      setDeleting(false)
    }
  }

  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!bot) return
    setSaving(true)
    setError(null)
    setLimitError(null)
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
      toast.success('Saved', 'Bot settings updated.')
    } catch (err) {
      const message = getErrorMessage(err, 'Save failed')
      if (isPlanLimitError(err)) setLimitError(message)
      else setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function publishNow() {
    if (!bot) return
    setPublishing(true)
    setLimitError(null)
    try {
      const updated = await api<Bot>(`/v1/bots/${botId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: true }),
      })
      setBot(updated)
      const embed = await api<{ snippet: string }>(`/v1/bots/${botId}/embed`)
      setSnippet(embed.snippet)
      toast.success('Published', 'Your embed widget is live.')
    } catch (err) {
      toast.error('Publish failed', getErrorMessage(err))
    } finally {
      setPublishing(false)
    }
  }

  async function deleteBot() {
    setDeleting(true)
    try {
      await api(`/v1/bots/${botId}`, { method: 'DELETE' })
      window.location.href = '/app'
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err, 'Could not delete bot'))
      setDeleting(false)
    }
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (!bot) {
    return <p className="text-sm text-ink/50">{error ?? 'Loading…'}</p>
  }

  const readyDocs = docs.filter((d) => d.status === 'ready').length
  const hasReadyDocs = readyDocs > 0
  const previewSrc = `${window.location.origin}/embed-preview.html?key=${encodeURIComponent(bot.public_key)}&api=${encodeURIComponent(API_URL)}`

  const tabs: { id: Tab; label: string }[] = [
    { id: 'docs', label: 'Documents' },
    { id: 'chat', label: 'Playground' },
    { id: 'embed', label: 'Embed' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-6">
      <div className="kb-rise">
        <Link to="/app" className="text-xs text-ink/45 transition hover:text-ink">
          ← All bots
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{bot.name}</h1>
          <Badge tone={bot.is_published ? 'ok' : 'warn'}>
            {bot.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-ink/50">
          {readyDocs} ready doc{readyDocs === 1 ? '' : 's'} · train, test, then embed
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-line/70 bg-white/70 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-teal text-white shadow-sm' : 'text-ink/65 hover:bg-mist hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {limitError ? <PlanLimitNotice message={limitError} /> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {tab === 'docs' ? (
        <div className="kb-rise kb-rise-1 space-y-4">
          <div className="rounded-2xl border border-line/80 bg-white/80 p-5 sm:p-6">
            <h2 className="font-display text-2xl tracking-tight">Upload knowledge</h2>
            <p className="mt-1 text-sm text-ink/55">
              Drop a help article to train this bot. Processing starts immediately.
            </p>
            <div className="mt-4">
              <DropZone busy={uploading} onFile={(file) => void onUpload(file)} />
            </div>
            <p className="mt-3 text-xs text-ink/45">
              Tip: try{' '}
              <a
                href="/sample-docs/getting-started.md"
                download
                className="font-medium text-teal hover:underline"
              >
                getting-started.md
              </a>{' '}
              from the sample docs.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line/80 bg-white/90">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/70 bg-mist/40 text-xs uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-line/60">
                    <td className="px-4 py-3 font-medium text-ink">{d.filename}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={d.status === 'ready' ? 'ok' : d.status === 'failed' ? 'bad' : 'warn'}
                      >
                        {d.status}
                      </Badge>
                      {d.error_message ? (
                        <span className="ml-2 text-xs text-red-600">{d.error_message}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink/55">{(d.bytes / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => setPendingDelete({ type: 'doc', id: d.id, name: d.filename })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-ink/45">
                      No documents yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'chat' ? (
        <div className="kb-rise kb-rise-1">
          <ChatPanel
            botId={botId}
            hasReadyDocs={hasReadyDocs}
            onGoToDocs={() => setTab('docs')}
          />
        </div>
      ) : null}

      {tab === 'embed' ? (
        <div className="kb-rise kb-rise-1 space-y-4">
          {!bot.is_published ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="min-w-0 flex-1 leading-relaxed">
                This bot is still a <span className="font-semibold">draft</span>. Publish it to unlock
                the live widget and public embed snippet.
              </p>
              <Button
                type="button"
                className="shrink-0 bg-amber-800 hover:bg-amber-900"
                disabled={publishing}
                onClick={() => void publishNow()}
              >
                {publishing ? 'Publishing…' : 'Publish now'}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line/80 bg-white/80 p-5 sm:p-6">
              <h2 className="font-display text-2xl tracking-tight">Embed snippet</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                Paste before <code className="text-ink/70">&lt;/body&gt;</code> on your site.
                {me?.subscription.limits.watermark
                  ? ' Free plan shows a Knowbase watermark.'
                  : ' No watermark on your plan.'}
              </p>
              <pre
                className={`mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-xs text-emerald-100 ${
                  bot.is_published ? '' : 'opacity-40'
                }`}
              >
                {bot.is_published ? snippet : '<!-- Publish this bot to reveal the embed snippet -->'}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!bot.is_published}
                  onClick={() => void copySnippet()}
                >
                  {copied ? 'Copied' : 'Copy snippet'}
                </Button>
                {!bot.is_published ? (
                  <Button type="button" variant="ghost" onClick={() => setTab('settings')}>
                    Open settings
                  </Button>
                ) : null}
              </div>
              <p className="mt-4 text-xs text-ink/40">
                {API_URL}/widget.js · {bot.public_key}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line/80 bg-white/80">
              <div className="border-b border-line/70 px-5 py-3">
                <p className="text-sm font-semibold text-ink">Live preview</p>
                <p className="text-[11px] text-ink/45">
                  {bot.is_published
                    ? 'Same floating widget your visitors will see'
                    : 'Available after you publish'}
                </p>
              </div>
              {bot.is_published ? (
                <iframe
                  title="Widget preview"
                  src={previewSrc}
                  className="h-[420px] w-full border-0 bg-foam"
                />
              ) : (
                <div className="flex h-[280px] flex-col items-center justify-center px-6 text-center">
                  <p className="text-sm text-ink/50">Publish the bot to load a live widget preview here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <form
          onSubmit={saveSettings}
          className="kb-rise kb-rise-1 space-y-4 rounded-2xl border border-line/80 bg-white/80 p-5 sm:p-6"
        >
          <div>
            <h2 className="font-display text-2xl tracking-tight">Settings</h2>
            <p className="mt-1 text-sm text-ink/55">Name, welcome copy, brand color, and publish state.</p>
          </div>
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
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" name="is_published" defaultChecked={bot.is_published} />
            Published (required for the embed widget)
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
            <Button type="button" variant="danger" onClick={() => setPendingDelete({ type: 'bot' })}>
              Delete bot
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={pendingDelete?.type === 'doc'}
        title="Delete document?"
        body={
          pendingDelete?.type === 'doc' ? (
            <>
              <span className="font-medium text-ink">{pendingDelete.name}</span> will be removed from
              this bot’s knowledge base.
            </>
          ) : null
        }
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (pendingDelete?.type === 'doc') void removeDoc(pendingDelete.id, pendingDelete.name)
        }}
      />

      <ConfirmDialog
        open={pendingDelete?.type === 'bot'}
        title="Delete this bot?"
        body="This removes the bot and all of its documents. This can’t be undone."
        confirmLabel="Delete bot"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={() => void deleteBot()}
      />
    </div>
  )
}
