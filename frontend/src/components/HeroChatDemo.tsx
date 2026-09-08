import { useEffect, useState } from 'react'

type DemoMsg = {
  who: 'user' | 'bot'
  text: string
  source?: string
}

const SCRIPT: Array<{ type: 'msg'; msg: DemoMsg } | { type: 'typing'; ms: number } | { type: 'pause'; ms: number }> = [
  { type: 'msg', msg: { who: 'user', text: 'How do I rotate API keys?' } },
  { type: 'typing', ms: 900 },
  {
    type: 'msg',
    msg: {
      who: 'bot',
      text: 'From Settings → API Keys, click Rotate. Old keys stay valid for 24 hours.',
      source: 'security.md',
    },
  },
  { type: 'pause', ms: 700 },
  { type: 'msg', msg: { who: 'user', text: 'Can I keep both keys during migration?' } },
  { type: 'typing', ms: 800 },
  {
    type: 'msg',
    msg: {
      who: 'bot',
      text: 'Yes — overlapping keys are supported for the full grace window.',
      source: 'security.md',
    },
  },
  { type: 'pause', ms: 2200 },
]

export function HeroChatDemo() {
  const [messages, setMessages] = useState<DemoMsg[]>([])
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function run() {
      while (!cancelled) {
        setMessages([])
        setTyping(false)
        for (const step of SCRIPT) {
          if (cancelled) return
          if (step.type === 'msg') {
            setTyping(false)
            setMessages((prev) => [...prev, step.msg])
            await wait(420)
          } else if (step.type === 'typing') {
            setTyping(true)
            await wait(step.ms)
          } else {
            setTyping(false)
            await wait(step.ms)
          }
        }
      }
    }

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      })
    }

    void run()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        aria-hidden
        className="kb-drift absolute -inset-8 rounded-[2rem] bg-teal/30 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#0a1714]/90 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal text-xs font-bold text-white">
            K
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Acme Docs Assistant</p>
            <p className="text-[11px] text-white/45">Answers from your knowledge base</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-emerald-300/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>

        <div className="flex min-h-[320px] flex-col gap-3 p-4 sm:min-h-[360px]">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.text.slice(0, 12)}`}
              className={`kb-bubble-in flex ${m.who === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed sm:text-sm ${
                  m.who === 'user'
                    ? 'rounded-br-md bg-teal text-white'
                    : 'rounded-bl-md bg-white/[0.08] text-white/90 ring-1 ring-white/10'
                }`}
              >
                {m.text}
                {m.source ? (
                  <span className="mt-2 block border-t border-white/10 pt-2 text-[10px] text-white/50">
                    Source · {m.source}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {typing ? (
            <div className="kb-bubble-in flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.08] px-4 py-3 ring-1 ring-white/10">
                <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
                <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
                <span className="kb-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm text-white/35 ring-1 ring-white/10">
            Ask about your product docs…
            <span className="ml-auto rounded-lg bg-teal/90 px-2.5 py-1 text-[11px] font-semibold text-white">
              Send
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
