import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import type { ChatSource } from '../lib/types'
import { Button } from './ui'
import { MarkdownMessage } from './MarkdownMessage'
import { getErrorMessage, isPlanLimitError, PlanLimitNotice } from './PlanLimitNotice'

type Msg = {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
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

export function ChatPanel({
  botId,
  hasReadyDocs,
  onGoToDocs,
}: {
  botId: string
  hasReadyDocs: boolean
  onGoToDocs?: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!hasReadyDocs || !input.trim() || busy) return
    const text = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setBusy(true)
    setError(null)
    setLimitError(null)
    try {
      const res = await api<{
        conversation_id: string
        answer: string
        sources: ChatSource[]
      }>(`/v1/bots/${botId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      })
      setConversationId(res.conversation_id)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch (err) {
      const message = getErrorMessage(err, 'Chat failed')
      if (isPlanLimitError(err)) setLimitError(message)
      else setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-line/80 bg-white/85 shadow-[0_16px_40px_-32px_rgba(15,118,110,0.35)]">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Playground</p>
          <p className="text-[11px] text-ink/45">Test answers against your knowledge base</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-[10px] font-medium text-teal-dark">
          <span className={`h-1.5 w-1.5 rounded-full ${hasReadyDocs ? 'bg-emerald-500' : 'bg-amber-500'}`} />
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
            {messages.length === 0 && !busy ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
                <p className="font-display text-xl tracking-tight text-ink">Ask anything from your docs</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">
                  Answers cite the chunks they used — try a product, pricing, or onboarding question.
                </p>
              </div>
            ) : null}

            {messages.map((m, i) => (
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
                    <MarkdownMessage content={m.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                  {m.sources && m.sources.length > 0 ? <Sources sources={m.sources} /> : null}
                </div>
              </div>
            ))}

            {busy ? (
              <div className="kb-bubble-in flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-mist px-4 py-3 ring-1 ring-line/50">
                  <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-ink/50" />
                  <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-ink/50" />
                  <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-ink/50" />
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          {limitError ? <PlanLimitNotice message={limitError} className="mx-3 mb-2" /> : null}
          {error ? (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>
          ) : null}

          <form onSubmit={send} className="flex gap-2 border-t border-line/70 bg-white/90 p-3">
            <input
              className="flex-1 rounded-xl border border-line bg-foam/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15"
              placeholder="Ask about your docs…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !input.trim()} className="shrink-0 px-5">
              Send
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
