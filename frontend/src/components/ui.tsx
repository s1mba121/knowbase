import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const base =
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary: 'bg-teal text-white hover:bg-teal-dark shadow-sm',
    secondary: 'bg-white text-ink border border-line hover:bg-mist',
    ghost: 'bg-transparent text-ink hover:bg-mist',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Input({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-ink/80">{label}</span> : null}
      <input
        className={`w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 ${className}`}
        {...props}
      />
    </label>
  )
}

export function TextArea({
  label,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-ink/80">{label}</span> : null}
      <textarea
        className={`w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 ${className}`}
        {...props}
      />
    </label>
  )
}

export function BrandMark({
  className = '',
  tone = 'light',
}: {
  className?: string
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 font-display text-xl tracking-tight ${
        dark ? 'text-white' : 'text-ink'
      } ${className}`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${
          dark ? 'bg-white text-teal-dark' : 'bg-teal text-white'
        }`}
      >
        K
      </span>
      Knowbase
    </Link>
  )
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-8 py-14 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'ok' | 'warn' | 'bad'
}) {
  const tones = {
    neutral: 'bg-mist text-ink/70',
    ok: 'bg-emerald-50 text-emerald-800',
    warn: 'bg-amber-50 text-amber-800',
    bad: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}
