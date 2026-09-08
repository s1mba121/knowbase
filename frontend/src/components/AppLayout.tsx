import { NavLink, Outlet, Link } from 'react-router-dom'
import { BrandMark, Button } from './ui'
import { useAuth } from '../lib/auth'

export function AppLayout() {
  const { me, signOut } = useAuth()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-white/80 text-teal-dark shadow-sm ring-1 ring-line/60' : 'text-ink/60 hover:bg-white/50 hover:text-ink'
    }`

  return (
    <div className="kb-page flex min-h-screen flex-col text-ink">
      <header className="sticky top-0 z-20 border-b border-line/50 bg-white/65 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-5 sm:gap-8">
            <BrandMark className="shrink-0" />
            <nav className="flex items-center gap-0.5">
              <NavLink to="/app" end className={linkClass}>
                Bots
              </NavLink>
              <NavLink to="/app/billing" className={linkClass}>
                Billing
              </NavLink>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {me ? (
              <div className="hidden items-center gap-2 rounded-full border border-line/70 bg-white/70 px-3 py-1.5 sm:flex">
                <span className="max-w-[140px] truncate text-xs font-medium text-ink md:max-w-[200px]">
                  {me.user.email}
                </span>
                <span className="h-1 w-1 rounded-full bg-ink/20" />
                <span className="whitespace-nowrap text-xs text-ink/55">
                  {me.subscription.limits.name} · {me.usage.messagesUsed}/{me.usage.messagesLimit}
                </span>
              </div>
            ) : null}
            <Button variant="ghost" className="px-3 py-2 text-ink/65" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-10">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-2">
        <Link to="/" className="text-xs text-ink/40 transition hover:text-ink">
          ← Home
        </Link>
      </footer>
    </div>
  )
}
