import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, streamChat, ApiError, unwrapPage } from '../lib/api'
import type { ChatSource } from '../lib/types'
import { Button } from './ui'
import { MarkdownMessage } from './MarkdownMessage'
import { ConfirmDialog } from './ConfirmDialog'
import { getErrorMessage, isPlanLimitError, PlanLimitNotice } from './PlanLimitNotice'
import { useToast } from './Toast'

type Msg = {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

type ConversationRow = {
  id: string
  preview: string
  updated_at: string
  message_count: number
}

type StoredMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: ChatSource[] | null
}

function Sources({ sources }: { sources: ChatSource[] }) {
  return (
    <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Sources</p>
      {sources.slice(0, 3).map((s) => (
        <div key={s.chunk_id} className="rounded-lg bg-white/70 px-2.5 py-2 ring-1 ring-black/5">
          <p className="truncate text-[11px] font-semibold text-ink/75">
            <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-teal/15 px-1 text-[10px] text-teal-dark">
              {s.index}
            </span>
            {s.filename ?? 'Document'}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink/50">{s.excerpt}</p>
        </div>
      ))}
    </div>
  )
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ChatPanel({
  botId,
  hasReadyDocs,
  onGoToDocs,
}: {
  botId: string
  hasReadyDocs: boolean
  onGoToDocs?: () => void
}) {
  const toast = useToast()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const refreshConversations = useCallback(async () => {
    try {
      const rows = await api<ConversationRow[]>(`/v1/bots/${botId}/conversations`)
      setConversations(rows)
    } catch {
      // list is non-blocking
    } finally {
      setLoadingList(false)
    }
  }, [botId])

  useEffect(() => {
    setMessages([])
    setConversationId(null)
    setLoadingList(true)
    void refreshConversations()
  }, [botId, refreshConversations])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, loadingThread])

  function startNewChat() {
    setConversationId(null)
    setMessages([])
    setError(null)
    setLimitError(null)
    setInput('')
  }

  async function openConversation(id: string) {
    if (id === conversationId || busy) return
    setLoadingThread(true)
    setError(null)
    setLimitError(null)
    try {
      const rows = unwrapPage(
        await api<StoredMessage[] | { items: StoredMessage[] }>(
          `/v1/bots/${botId}/conversations/${id}`,
        ),
      )
      setConversationId(id)
      setMessages(
        rows
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            sources: Array.isArray(m.sources) ? m.sources : undefined,
          })),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load chat'))
    } finally {
      setLoadingThread(false)
    }
  }

  async function confirmDeleteChat() {
    if (!pendingDeleteId) return
    setDeleting(true)
    try {
      await api(`/v1/bots/${botId}/conversations/${pendingDeleteId}`, { method: 'DELETE' })
      if (conversationId === pendingDeleteId) startNewChat()
      setPendingDeleteId(null)
      await refreshConversations()
      toast.success('Chat deleted')
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  async function copyAnswer(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      window.setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1600)
    } catch {
      toast.error('Copy failed', 'Clipboard is not available')
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!hasReadyDocs || !input.trim() || busy) return
    const text = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setBusy(true)
    setError(null)
    setLimitError(null)

    let sources: ChatSource[] | undefined
    try {
      await streamChat(
        `/v1/bots/${botId}/chat/stream`,
        { message: text, conversation_id: conversationId },
        (event) => {
          if (event.type === 'meta') {
            setConversationId(event.conversation_id)
            sources = Array.isArray(event.sources) ? (event.sources as ChatSource[]) : undefined
          } else if (event.type === 'token') {
            setMessages((m) => {
              const next = [...m]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + event.content }
              }
              return next
            })
          } else if (event.type === 'done') {
            setMessages((m) => {
              const next = [...m]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  content: event.answer || last.content,
                  sources,
                }
              }
              return next
            })
          } else if (event.type === 'error') {
            const err = new ApiError(event.status ?? 500, event.error)
            throw err
          }
        },
      )
      await refreshConversations()
    } catch (err) {
      const message = getErrorMessage(err, 'Chat failed')
      setMessages((m) => {
        const next = [...m]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && !last.content) next.pop()
        return next
      })
      if (isPlanLimitError(err)) setLimitError(message)
      else setError(message)
    } finally {
      setBusy(false)
    }
  }

  const pendingPreview =
    conversations.find((c) => c.id === pendingDeleteId)?.preview ?? 'this chat'

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-line/80 bg-white/85 shadow-[0_16px_40px_-32px_rgba(15,118,110,0.35)] md:flex-row">
      <aside className="flex max-h-44 flex-col border-b border-line/70 md:max-h-none md:w-56 md:shrink-0 md:border-b-0 md:border-r lg:w-64">
        <div className="flex items-center justify-between gap-2 border-b border-line/60 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Chats</p>
          <button
            type="button"
            disabled={!hasReadyDocs || busy}
            onClick={startNewChat}
            className="rounded-lg bg-teal px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-teal-dark disabled:opacity-40"
          >
            New
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {!hasReadyDocs ? (
            <p className="px-2 py-3 text-xs leading-relaxed text-ink/40">
              Upload at least one ready document to unlock playground chats.
            </p>
          ) : loadingList ? (
            <p className="px-2 py-3 text-xs text-ink/40">Loading chats…</p>
          ) : (
            <>
              <button
                type="button"
                onClick={startNewChat}
                className={`w-full rounded-lg px-2.5 py-2 text-left transition ${
                  conversationId === null
                    ? 'bg-mist text-teal-dark'
                    : 'text-ink/70 hover:bg-mist/70'
                }`}
              >
                <p className="truncate text-xs font-semibold">New chat</p>
                <p className="mt-0.5 text-[10px] text-ink/40">Fresh thread with memory</p>
              </button>
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-start gap-1 rounded-lg transition ${
                    conversationId === c.id ? 'bg-mist text-teal-dark' : 'text-ink/70 hover:bg-mist/70'
                  }`}
                >
                  <button
                    type="button"
                    disabled={busy || loadingThread}
                    onClick={() => void openConversation(c.id)}
                    className="min-w-0 flex-1 px-2.5 py-2 text-left"
                  >
                    <p className="truncate text-xs font-semibold">{c.preview || 'Chat'}</p>
                    <p className="mt-0.5 text-[10px] text-ink/40">{formatWhen(c.updated_at)}</p>
                  </button>
                  <button
                    type="button"
                    title="Delete chat"
                    aria-label="Delete chat"
                    disabled={busy || deleting}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDeleteId(c.id)
                    }}
                    className="mr-1 mt-1.5 rounded-md px-1.5 py-1 text-[10px] font-medium text-ink/30 opacity-100 transition hover:bg-white/80 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {conversations.length === 0 ? (
                <p className="px-2 py-3 text-[11px] leading-relaxed text-ink/40">
                  No chats yet. Send a message to create your first thread.
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">Playground</p>
            <p className="text-[11px] text-ink/45">
              {conversationId ? 'Continuing chat · streaming answers' : 'New conversation · streaming'}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-[10px] font-medium text-teal-dark">
            <span
              className={`h-1.5 w-1.5 rounded-full ${hasReadyDocs ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {hasReadyDocs ? 'Live' : 'Needs docs'}
          </span>
        </div>

        {!hasReadyDocs ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="font-display text-xl tracking-tight text-ink">Upload docs first</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">
              Playground answers from ready documents in this bot’s knowledge base.
            </p>
            {onGoToDocs ? (
              <Button type="button" className="mt-6" onClick={onGoToDocs}>
                Go to Documents
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loadingThread ? <p className="text-sm text-ink/45">Loading chat…</p> : null}

              {!loadingThread && messages.length === 0 && !busy ? (
                <div className="flex h-full min-h-[180px] flex-col items-center justify-center px-6 text-center">
                  <p className="font-display text-xl tracking-tight text-ink">Ask anything from your docs</p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">
                    Follow-ups stay in context. Answers stream live with citations.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {['How do I get started?', 'What are the limits?', 'Where are citations from?'].map(
                      (q) => (
                        <button
                          key={q}
                          type="button"
                          className="rounded-full border border-line/80 bg-white/80 px-3 py-1.5 text-xs text-ink/65 transition hover:border-teal/40 hover:text-ink"
                          onClick={() => setInput(q)}
                        >
                          {q}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {!loadingThread
                ? messages.map((m, i) => (
                    <div
                      key={i}
                      className={`kb-bubble-in flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'rounded-br-md bg-teal text-white'
                            : 'rounded-bl-md bg-mist text-ink ring-1 ring-line/50'
                        }`}
                      >
                        {m.role === 'assistant' ? (
                          m.content ? (
                            <MarkdownMessage content={m.content} />
                          ) : (
                            <div className="flex items-center gap-1.5 py-1">
                              <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-ink/50" />
                              <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-ink/50" />
                              <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-ink/50" />
                            </div>
                          )
                        ) : (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        )}
                        {m.sources && m.sources.length > 0 ? <Sources sources={m.sources} /> : null}
                        {m.role === 'assistant' && m.content && !busy ? (
                          <div className="mt-2 flex justify-end border-t border-black/5 pt-2">
                            <button
                              type="button"
                              className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 transition hover:text-teal"
                              onClick={() => void copyAnswer(m.content, i)}
                            >
                              {copiedIndex === i ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                : null}
              <div ref={endRef} />
            </div>

            {limitError ? <PlanLimitNotice message={limitError} className="mx-3 mb-2" /> : null}
            {error ? (
              <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>
            ) : null}

            <form onSubmit={send} className="flex gap-2 border-t border-line/70 bg-white/90 p-3">
              <input
                className="flex-1 rounded-xl border border-line bg-foam/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15"
                placeholder="Ask a follow-up or a new question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy || loadingThread}
              />
              <Button
                type="submit"
                disabled={busy || loadingThread || !input.trim()}
                className="shrink-0 px-5"
              >
                Send
              </Button>
            </form>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete this chat?"
        body={
          <>
            <span className="font-medium text-ink">{pendingPreview}</span> and its messages will be
            removed.
          </>
        }
        confirmLabel="Delete chat"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null)
        }}
        onConfirm={() => void confirmDeleteChat()}
      />
    </div>
  )
}
