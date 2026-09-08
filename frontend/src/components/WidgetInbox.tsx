import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ChatSource } from '../lib/types'
import { Badge } from './ui'
import { MarkdownMessage } from './MarkdownMessage'
import { ConfirmDialog } from './ConfirmDialog'
import { getErrorMessage } from './PlanLimitNotice'
import { useToast } from './Toast'

type InboxRow = {
  id: string
  preview: string
  visitor_id: string | null
  updated_at: string
  message_count: number
}

type StoredMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: ChatSource[] | null
  created_at: string
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WidgetInbox({ botId }: { botId: string }) {
  const toast = useToast()
  const [rows, setRows] = useState<InboxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<InboxRow[]>(`/v1/bots/${botId}/conversations?channel=widget`)
      setRows(data)
    } catch (err) {
      toast.error('Inbox failed', getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [botId])

  useEffect(() => {
    void load()
  }, [load])

  async function openThread(id: string) {
    setActiveId(id)
    setLoadingThread(true)
    try {
      const data = await api<StoredMessage[]>(`/v1/bots/${botId}/conversations/${id}`)
      setMessages(data.filter((m) => m.role === 'user' || m.role === 'assistant'))
    } catch (err) {
      toast.error('Load failed', getErrorMessage(err))
    } finally {
      setLoadingThread(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    setDeleting(true)
    try {
      await api(`/v1/bots/${botId}/conversations/${pendingDeleteId}`, { method: 'DELETE' })
      if (activeId === pendingDeleteId) {
        setActiveId(null)
        setMessages([])
      }
      setPendingDeleteId(null)
      await load()
      toast.success('Conversation deleted')
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const pendingPreview = rows.find((r) => r.id === pendingDeleteId)?.preview ?? 'this conversation'

  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-white/85">
      <div className="border-b border-line/70 px-5 py-4">
        <h2 className="font-display text-2xl tracking-tight">Widget inbox</h2>
        <p className="mt-1 text-sm text-ink/55">
          Conversations from your embedded website widget.
        </p>
      </div>

      <div className="grid min-h-[420px] lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-line/70 lg:border-b-0 lg:border-r">
          <div className="max-h-[280px] space-y-0.5 overflow-y-auto p-2 lg:max-h-[520px]">
            {loading ? <p className="px-2 py-3 text-xs text-ink/40">Loading…</p> : null}
            {!loading && rows.length === 0 ? (
              <p className="px-3 py-6 text-xs leading-relaxed text-ink/45">
                No widget chats yet. Publish the bot and ask a question from the embed preview.
              </p>
            ) : null}
            {rows.map((r) => (
              <div
                key={r.id}
                className={`group flex items-start rounded-lg ${
                  activeId === r.id ? 'bg-mist' : 'hover:bg-mist/70'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 px-2.5 py-2 text-left"
                  onClick={() => void openThread(r.id)}
                >
                  <p className="truncate text-xs font-semibold text-ink">{r.preview || 'Visitor chat'}</p>
                  <p className="mt-0.5 text-[10px] text-ink/40">
                    {formatWhen(r.updated_at)}
                    {r.visitor_id ? ` · ${r.visitor_id.slice(0, 10)}…` : ''}
                  </p>
                </button>
                <button
                  type="button"
                  className="mr-1 mt-1.5 rounded-md px-1.5 py-1 text-[10px] text-ink/30 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => setPendingDeleteId(r.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-h-[280px] flex-col p-4">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-ink/45">
              Select a visitor conversation to review.
            </div>
          ) : loadingThread ? (
            <p className="text-sm text-ink/45">Loading…</p>
          ) : (
            <div className="space-y-3 overflow-y-auto">
              <div className="flex items-center gap-2">
                <Badge tone="neutral">Widget</Badge>
                <span className="text-xs text-ink/45">{messages.length} messages</span>
              </div>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'ml-8 bg-teal text-white'
                      : 'mr-8 bg-mist text-ink ring-1 ring-line/50'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <MarkdownMessage content={m.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete conversation?"
        body={
          <>
            <span className="font-medium text-ink">{pendingPreview}</span> will be removed from the
            inbox.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
