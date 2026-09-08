import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastTone = 'info' | 'ok' | 'bad'

type ToastItem = {
  id: string
  title: string
  body?: string
  tone: ToastTone
  leaving?: boolean
}

type ToastApi = {
  push: (toast: Omit<ToastItem, 'id' | 'leaving'> & { id?: string; durationMs?: number }) => string
  dismiss: (id: string) => void
  info: (title: string, body?: string, opts?: { id?: string; durationMs?: number }) => string
  success: (title: string, body?: string, opts?: { id?: string; durationMs?: number }) => string
  error: (title: string, body?: string, opts?: { id?: string; durationMs?: number }) => string
}

const ToastContext = createContext<ToastApi | null>(null)

const EXIT_MS = 280
let toastSeq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) {
      window.clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const remove = useCallback((id: string) => {
    clearTimer(id)
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [clearTimer])

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id)
      setItems((prev) => {
        const target = prev.find((t) => t.id === id)
        if (!target || target.leaving) return prev
        return prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      })
      const exitTimer = window.setTimeout(() => remove(id), EXIT_MS)
      timers.current.set(id, exitTimer)
    },
    [clearTimer, remove],
  )

  const push = useCallback(
    (toast: Omit<ToastItem, 'id' | 'leaving'> & { id?: string; durationMs?: number }) => {
      const id = toast.id ?? `t-${++toastSeq}`
      clearTimer(id)
      const item: ToastItem = {
        id,
        title: toast.title,
        body: toast.body,
        tone: toast.tone,
      }
      setItems((prev) => [...prev.filter((t) => t.id !== id), item])
      const duration = toast.durationMs ?? (toast.tone === 'info' ? 0 : 4200)
      if (duration > 0) {
        const auto = window.setTimeout(() => dismiss(id), duration)
        timers.current.set(id, auto)
      }
      return id
    },
    [clearTimer, dismiss],
  )

  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) window.clearTimeout(t)
      timers.current.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      push,
      dismiss,
      info: (title, body, opts) => push({ title, body, tone: 'info', ...opts }),
      success: (title, body, opts) => push({ title, body, tone: 'ok', ...opts }),
      error: (title, body, opts) => push({ title, body, tone: 'bad', ...opts }),
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`kb-toast pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-[0_16px_40px_-20px_rgba(12,26,23,0.45)] backdrop-blur-md ${
              t.leaving ? 'kb-toast-out' : ''
            } ${
              t.tone === 'ok'
                ? 'border-emerald-200/80 bg-white/95'
                : t.tone === 'bad'
                  ? 'border-red-200/80 bg-white/95'
                  : 'border-line/80 bg-white/95'
            }`}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                t.tone === 'ok' ? 'bg-emerald-500' : t.tone === 'bad' ? 'bg-red-500' : 'bg-teal kb-toast-pulse'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.body ? <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{t.body}</p> : null}
            </div>
            <button
              type="button"
              className="shrink-0 self-start text-ink/35 transition hover:text-ink"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
