/** Shared cursor pagination helpers. */
export function clampLimit(raw: unknown, fallback: number, max: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : fallback
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), max)
}

export function pageFromRows<T>(rows: T[], limit: number): { items: T[]; next_cursor: string | null } {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, next_cursor: null }
}
