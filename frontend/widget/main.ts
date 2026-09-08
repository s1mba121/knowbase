type WidgetConfig = {
  name: string
  welcome_message: string
  primary_color: string
  watermark: boolean
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

async function main() {
  const script = getScriptEl()
  if (!script) return

  const botKey = script.getAttribute('data-bot-key')
  const apiBase = (script.getAttribute('data-api') || '').replace(/\/$/, '')
  if (!botKey || !apiBase) {
    console.error('[Knowbase] data-bot-key and data-api are required')
    return
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
      color: #fff; font-size: 22px; box-shadow: 0 12px 30px rgba(0,0,0,.22);
    }
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
  `
  document.head.appendChild(style)

  let open = false
  let conversationId: string | null = null
  const messages: Msg[] = [{ role: 'assistant', content: config.welcome_message }]

  const btn = document.createElement('button')
  btn.className = 'kb-btn'
  btn.style.background = config.primary_color
  btn.setAttribute('aria-label', 'Open chat')
  btn.textContent = '💬'
  root.appendChild(btn)

  const panel = document.createElement('div')
  panel.className = 'kb-panel'
  panel.style.display = 'none'
  panel.style.setProperty('--kb', config.primary_color)
  root.appendChild(panel)

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
    const send = document.createElement('button')
    send.type = 'submit'
    send.textContent = 'Send'
    form.append(input, send)
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const text = input.value.trim()
      if (!text) return
      input.value = ''
      messages.push({ role: 'user', content: text })
      render()
      body.scrollTop = body.scrollHeight
      try {
        const res = await fetch(`${apiBase}/v1/widget/${botKey}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversation_id: conversationId,
            visitor_id: visitorId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Chat failed')
        conversationId = data.conversation_id
        messages.push({ role: 'assistant', content: data.answer, sources: data.sources })
      } catch (err) {
        messages.push({
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong',
        })
      }
      render()
    })
    panel.appendChild(form)
    body.scrollTop = body.scrollHeight
  }

  btn.addEventListener('click', () => {
    open = !open
    panel.style.display = open ? 'flex' : 'none'
    btn.textContent = open ? '✕' : '💬'
    if (open) render()
  })
}

void main()
