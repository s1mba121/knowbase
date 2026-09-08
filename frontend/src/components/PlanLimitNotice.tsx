import { Link } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { Button } from './ui'

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error ? err.message : fallback
}

export function isPlanLimitError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 402
}

export function PlanLimitNotice({
  message,
  className = '',
}: {
  message: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
    >
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
      <Link to="/app/billing" className="shrink-0">
        <Button type="button" className="bg-amber-800 hover:bg-amber-900">
          Upgrade plan
        </Button>
      </Link>
    </div>
  )
}
