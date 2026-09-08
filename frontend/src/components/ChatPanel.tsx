import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import type { ChatSource } from '../lib/types'
import { Button } from './ui'
import { MarkdownMessage } from './MarkdownMessage'

type Msg = {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export function ChatPanel({ botId }: { botId: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || busy) return
    const text = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setBusy(true)
    setError(null)
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
      setError(err instanceof Error ? err.message : 'Chat failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-4 py-3 text-sm font-semibold">Playground</div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-ink/50">Ask a question about your uploaded docs.</p>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-teal text-white' : 'bg-mist text-ink'
              }`}
            >
              {m.role === 'assistant' ? (
                <MarkdownMessage content={m.content} />
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
              {m.sources && m.sources.length > 0 ? (
                <div className="mt-3 space-y-1 border-t border-black/10 pt-2 text-[11px] text-ink/60">
                  {m.sources.slice(0, 3).map((s) => (
                    <div key={s.chunk_id}>
                      [{s.index}] {s.filename ?? 'doc'} — {s.excerpt.slice(0, 100)}…
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? <p className="text-xs text-ink/45">Thinking…</p> : null}
        <div ref={endRef} />
      </div>
      {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-teal"
          placeholder="Ask about your product…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
