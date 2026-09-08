import { NavLink, Outlet, Link } from 'react-router-dom'
import { BrandMark, Button } from './ui'
import { useAuth } from '../lib/auth'

export function AppLayout() {
  const { me, signOut } = useAuth()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-mist text-teal-dark' : 'text-ink/70 hover:bg-mist/70'}`

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#dceee9_0%,_#f4faf8_55%)]">
      <header className="border-b border-line/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-8">
            <BrandMark />
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink to="/app" end className={linkClass}>
                Bots
              </NavLink>
              <NavLink to="/app/billing" className={linkClass}>
                Billing
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {me ? (
              <div className="hidden text-right text-xs sm:block">
                <div className="font-medium text-ink">{me.user.email}</div>
                <div className="text-ink/55">
                  {me.subscription.limits.name} · {me.usage.messagesUsed}/{me.usage.messagesLimit} msgs
                </div>
              </div>
            ) : null}
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-ink/45">
        <Link to="/" className="hover:text-ink">
          ← Back to marketing site
        </Link>
      </footer>
    </div>
  )
}
