import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from './ui'
import { HeroChatDemo } from './HeroChatDemo'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="relative flex flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 55% at 15% 0%, rgba(156, 205, 192, 0.45) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(176, 208, 198, 0.35) 0%, transparent 50%), #f4faf8',
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <BrandMark />
          <Link to="/" className="text-sm text-ink/45 transition hover:text-ink">
            ← Home
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <div className="relative z-10 border-t border-white/10 bg-[#0d1f1b] px-6 py-6 text-white md:hidden">
          <p className="font-display text-xl tracking-tight">Docs in. Cited answers out.</p>
          <p className="mt-2 text-sm text-white/50">
            Upload docs, test in playground, embed on your site.
          </p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-[#0d1f1b] text-white md:flex md:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 70% 0%, rgba(15,118,110,0.45) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(15,118,110,0.2) 0%, transparent 50%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 75% 65% at 55% 35%, black, transparent)',
          }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-10 lg:px-14 lg:py-12">
          <div className="max-w-md">
            <h2 className="font-display text-3xl leading-[1.12] tracking-tight lg:text-4xl xl:text-[2.75rem]">
              Docs in.
              <br />
              Cited answers out.
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/50">
              Upload SaaS documentation, test in a playground, and embed a support widget — with
              sources you can verify.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {['PDF', 'Markdown', 'Playground', 'Widget'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/55"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="my-8 max-w-md">
            <HeroChatDemo />
          </div>

          <div className="max-w-md border-t border-white/10 pt-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                ['1 bot', 'on the Free plan'],
                ['Cited', 'answers by default'],
                ['1-line', 'website embed'],
              ].map(([title, body]) => (
                <div key={title}>
                  <p className="font-display text-lg text-white lg:text-xl">{title}</p>
                  <p className="mt-1 text-xs leading-snug text-white/40">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
