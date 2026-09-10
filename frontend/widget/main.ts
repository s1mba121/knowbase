type WidgetConfig = {
  name: string
  welcome_message: string
  primary_color: string
  watermark: boolean
  suggestions?: string[]
}

type ChatSource = {
  index: number
  filename: string | null
  excerpt: string
}

type Msg = { role: 'user' | 'assistant'; content: string; sources?: ChatSource[] }

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Minimal markdown → HTML for widget bubbles (bold, italic, code, lists, breaks). */
function renderMarkdown(md: string): string {
  const escaped = escapeHtml(md)
  const lines = escaped.split('\n')
  const html: string[] = []
  let inList: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (inList) {
      html.push(`</${inList}>`)
      inList = null
    }
  }

  const inline = (line: string) =>
    line
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')

  for (const line of lines) {
    const ol = line.match(/^\d+\.\s+(.*)$/)
    const ul = line.match(/^[-*]\s+(.*)$/)
    if (ol) {
      if (inList !== 'ol') {
        closeList()
        html.push('<ol>')
        inList = 'ol'
      }
      html.push(`<li>${inline(ol[1])}</li>`)
      continue
    }
    if (ul) {
      if (inList !== 'ul') {
        closeList()
        html.push('<ul>')
        inList = 'ul'
      }
      html.push(`<li>${inline(ul[1])}</li>`)
      continue
    }
    closeList()
    if (!line.trim()) {
      html.push('<br />')
    } else {
      html.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  return html.join('')
}

function getScriptEl(): HTMLScriptElement | null {
  return document.currentScript as HTMLScriptElement | null
    ?? document.querySelector('script[data-bot-key]')
}

function createVisitorId(): string {
  const key = 'knowbase_visitor'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = `v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
  localStorage.setItem(key, id)
  return id
}

function iconChat(): string {
  // Chat bubble; slight translate offsets the left/bottom tail so it looks centered in the FAB
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <g transform="translate(0.75 1.1)">
      <path
        d="M12 3.25c4.83 0 8.75 3.2 8.75 7.15 0 3.95-3.92 7.15-8.75 7.15-.9 0-1.77-.11-2.58-.32l-3.92 1.77.95-3.55C4.4 14.05 3.25 12.35 3.25 10.4c0-3.95 3.92-7.15 8.75-7.15Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
      <circle cx="8.75" cy="10.4" r="1.15" fill="currentColor"/>
      <circle cx="12" cy="10.4" r="1.15" fill="currentColor"/>
      <circle cx="15.25" cy="10.4" r="1.15" fill="currentColor"/>
    </g>
  </svg>`
}

function iconClose(): string {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
}

async function main() {
  const script = getScriptEl()
  if (!script) return

  const botKey = script.getAttribute('data-bot-key')
  let apiBase = (script.getAttribute('data-api') || '').replace(/\/$/, '')
  if (!botKey || !apiBase) {
    console.error('[Knowbase] data-bot-key and data-api are required')
    return
  }
  // Stale snippets sometimes still point at localhost — recover on real sites.
  if (
    typeof location !== 'undefined' &&
    location.protocol === 'https:' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(apiBase)
  ) {
    console.warn('[Knowbase] data-api points at localhost; using', location.origin)
    apiBase = location.origin
  }

  const configRes = await fetch(`${apiBase}/v1/widget/${botKey}/config`)
  if (!configRes.ok) {
    console.error('[Knowbase] Failed to load widget config')
    return
  }
  const config = (await configRes.json()) as WidgetConfig
  const visitorId = createVisitorId()

  const root = document.createElement('div')
  root.id = 'knowbase-widget-root'
  document.body.appendChild(root)

  const style = document.createElement('style')
  style.textContent = `
    #knowbase-widget-root { all: initial; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    #knowbase-widget-root * { box-sizing: border-box; }
    .kb-btn {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
      width: 56px; height: 56px; border-radius: 999px; border: none; cursor: pointer;
      color: #fff; box-shadow: 0 12px 30px rgba(0,0,0,.22);
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0; line-height: 0;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kb-btn:hover { transform: translateY(-1px); box-shadow: 0 16px 34px rgba(0,0,0,.26); }
    .kb-btn:active { transform: translateY(0); }
    .kb-btn svg { width: 24px; height: 24px; display: block; flex-shrink: 0; }
    .kb-panel {
      position: fixed; right: 20px; bottom: 88px; z-index: 2147483000;
      width: min(380px, calc(100vw - 24px)); height: min(560px, calc(100vh - 120px));
      background: #fff; border-radius: 18px; overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,.28); display: flex; flex-direction: column;
      border: 1px solid rgba(0,0,0,.06);
    }
    .kb-head { padding: 14px 16px; color: #fff; font-weight: 600; font-size: 14px; }
    .kb-body { flex: 1; overflow: auto; padding: 14px; background: #f6faf8; }
    .kb-msg { max-width: 85%; margin: 0 0 10px; padding: 10px 12px; border-radius: 14px; font-size: 13px; line-height: 1.45; }
    .kb-msg p { margin: 0 0 8px; }
    .kb-msg p:last-child { margin-bottom: 0; }
    .kb-msg ul, .kb-msg ol { margin: 0 0 8px; padding-left: 1.2em; }
    .kb-msg li { margin: 0 0 4px; }
    .kb-msg strong { font-weight: 700; }
    .kb-msg code { font-size: 0.9em; background: rgba(0,0,0,.06); padding: 1px 4px; border-radius: 4px; }
    .kb-user { margin-left: auto; background: var(--kb); color: #fff; white-space: pre-wrap; }
    .kb-bot { margin-right: auto; background: #fff; color: #122; border: 1px solid #e4ebe8; }
    .kb-src { margin-top: 8px; font-size: 10px; color: #567; border-top: 1px solid #e8eeeb; padding-top: 6px; }
    .kb-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e4ebe8; background: #fff; }
    .kb-form input { flex: 1; border: 1px solid #d5e0dc; border-radius: 10px; padding: 10px 12px; font-size: 13px; outline: none; }
    .kb-form button { border: none; border-radius: 10px; padding: 0 14px; color: #fff; font-weight: 600; cursor: pointer; background: var(--kb); }
    .kb-water { font-size: 10px; text-align: center; padding: 4px; color: #89a; background: #f6faf8; }
    .kb-sugs { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
    .kb-sug {
      border: 1px solid #d7e3df; background: #fff; color: #234; border-radius: 999px;
      padding: 6px 10px; font-size: 11px; cursor: pointer; line-height: 1.2;
    }
    .kb-sug:hover { border-color: var(--kb); color: #000; }
    .kb-sug:disabled { opacity: 0.5; cursor: default; }
    .kb-typing {
      margin-right: auto; background: #fff; color: #567; border: 1px solid #e4ebe8;
      display: flex; align-items: center; gap: 5px; padding: 12px 14px; min-height: 18px;
    }
    .kb-typing-dot {
      width: 6px; height: 6px; border-radius: 999px; background: rgba(12, 26, 23, 0.45);
      animation: kb-typing 1.15s infinite;
    }
    .kb-typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .kb-typing-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes kb-typing {
      0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-3px); }
    }
    .kb-form button:disabled { opacity: 0.6; cursor: wait; }
    .kb-form input:disabled { opacity: 0.7; }
  `
  document.head.appendChild(style)

  let open = false
  let pending = false
  let conversationId: string | null = null
  const messages: Msg[] = [{ role: 'assistant', content: config.welcome_message }]

  const btn = document.createElement('button')
  btn.className = 'kb-btn'
  btn.style.background = config.primary_color
  btn.setAttribute('aria-label', 'Open chat')
  btn.innerHTML = iconChat()
  root.appendChild(btn)

  const panel = document.createElement('div')
  panel.className = 'kb-panel'
  panel.style.display = 'none'
  panel.style.setProperty('--kb', config.primary_color)
  root.appendChild(panel)

  async function ask(text: string) {
    if (!text.trim() || pending) return
    pending = true
    messages.push({ role: 'user', content: text.trim() })
    render()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 60_000)
    try {
      const res = await fetch(`${apiBase}/v1/widget/${botKey}/chat`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationId,
          visitor_id: visitorId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chat failed')
      conversationId = data.conversation_id
      messages.push({ role: 'assistant', content: data.answer, sources: data.sources })
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'AbortError'
      const network = err instanceof TypeError
      messages.push({
        role: 'assistant',
        content: timedOut
          ? 'Taking too long — please try again in a moment.'
          : network
            ? 'Could not reach the Knowbase API (network/CORS). Check the embed data-api URL.'
            : err instanceof Error
              ? err.message
              : 'Something went wrong',
      })
    } finally {
      window.clearTimeout(timer)
      pending = false
      render()
    }
  }

  function render() {
    panel.innerHTML = ''
    const head = document.createElement('div')
    head.className = 'kb-head'
    head.style.background = config.primary_color
    head.textContent = config.name
    panel.appendChild(head)

    const body = document.createElement('div')
    body.className = 'kb-body'
    messages.forEach((m) => {
      const el = document.createElement('div')
      el.className = `kb-msg ${m.role === 'user' ? 'kb-user' : 'kb-bot'}`
      if (m.role === 'assistant') {
        el.innerHTML = renderMarkdown(m.content)
      } else {
        el.textContent = m.content
      }
      if (m.sources?.length) {
        const src = document.createElement('div')
        src.className = 'kb-src'
        src.textContent = m.sources
          .slice(0, 2)
          .map((s) => `[${s.index}] ${s.filename ?? 'doc'}`)
          .join(' · ')
        el.appendChild(src)
      }
      body.appendChild(el)
    })

    if (pending) {
      const typing = document.createElement('div')
      typing.className = 'kb-msg kb-typing'
      typing.setAttribute('aria-label', 'Assistant is typing')
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span')
        dot.className = 'kb-typing-dot'
        typing.appendChild(dot)
      }
      body.appendChild(typing)
    }

    const onlyWelcome = messages.length === 1 && messages[0]?.role === 'assistant'
    if (onlyWelcome && !pending && config.suggestions?.length) {
      const sugs = document.createElement('div')
      sugs.className = 'kb-sugs'
      config.suggestions.slice(0, 3).forEach((q) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'kb-sug'
        b.textContent = q
        b.disabled = pending
        b.addEventListener('click', () => void ask(q))
        sugs.appendChild(b)
      })
      body.appendChild(sugs)
    }

    panel.appendChild(body)

    if (config.watermark) {
      const w = document.createElement('div')
      w.className = 'kb-water'
      w.textContent = 'Powered by Knowbase'
      panel.appendChild(w)
    }

    const form = document.createElement('form')
    form.className = 'kb-form'
    const input = document.createElement('input')
    input.placeholder = 'Ask a question…'
    input.disabled = pending
    const send = document.createElement('button')
    send.type = 'submit'
    send.textContent = pending ? '…' : 'Send'
    send.disabled = pending
    form.append(input, send)
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const text = input.value.trim()
      if (!text) return
      input.value = ''
      await ask(text)
    })
    panel.appendChild(form)
    body.scrollTop = body.scrollHeight
    if (!pending) input.focus()
  }

  btn.addEventListener('click', () => {
    open = !open
    panel.style.display = open ? 'flex' : 'none'
    btn.innerHTML = open ? iconClose() : iconChat()
    btn.setAttribute('aria-label', open ? 'Close chat' : 'Open chat')
    if (open) render()
  })
}

void main()
