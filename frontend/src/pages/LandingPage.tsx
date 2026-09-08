import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark, Button } from '../components/ui'
import { PLANS_COPY } from '../lib/pricing'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_-10%,#9fd4c8_0%,transparent_45%),radial-gradient(90%_70%_at_100%_0%,#f2d6a2_0%,transparent_40%),linear-gradient(180deg,#f7fbf9_0%,#eef6f3_100%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-white/50">
            Sign in
          </Link>
          <Link to="/login">
            <Button>Start free</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark/80">Knowbase</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-ink md:text-6xl">
            Product docs that answer your users.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/70">
            Upload your SaaS documentation, get a ChatGPT-style assistant in your app, and drop an embeddable
            widget on your site — with citations from your own knowledge base.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login">
              <Button className="px-5 py-3 text-base">Build your chatbot</Button>
            </Link>
            <a href="#pricing">
              <Button variant="secondary" className="px-5 py-3 text-base">
                See pricing
              </Button>
            </a>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-ink shadow-[0_30px_80px_-40px_rgba(12,26,23,0.55)]">
          <div className="border-b border-white/10 px-5 py-3 text-xs font-medium text-white/60">
            Preview · Docs assistant
          </div>
          <div className="space-y-3 p-5">
            <Bubble who="user">How do I rotate API keys?</Bubble>
            <Bubble who="bot">
              From Settings → API Keys, click Rotate. Old keys expire after 24 hours.
              <span className="mt-2 block text-[11px] text-teal/90">[Source 1 — security.md]</span>
            </Bubble>
            <Bubble who="user">Can I keep both keys during migration?</Bubble>
            <Bubble who="bot">Yes — overlapping keys are supported during the grace window.</Bubble>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal/30 blur-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" id="how">
        <h2 className="font-display text-3xl md:text-4xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-ink/65">Three steps from docs to a live support widget.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['1. Upload docs', 'PDF, Markdown, or TXT from your help center and product manuals.'],
            ['2. Train instantly', 'We chunk, embed, and index your knowledge with vector search.'],
            ['3. Embed anywhere', 'Copy one script tag. Customize color and welcome message on Pro.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-line/80 bg-white/70 p-6">
              <h3 className="font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm text-ink/65">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" id="features">
        <h2 className="font-display text-3xl md:text-4xl">Built for SaaS support teams</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['Cited answers', 'Every reply can point back to the doc chunk it used — less hallucinated support.'],
            ['In-app playground', 'Chat like ChatGPT while you tune the system prompt and knowledge base.'],
            ['Embeddable widget', 'Floating bubble for marketing sites and docs portals — no iframe required.'],
            ['Plan-aware limits', 'Free to try, Pro when you need more bots, messages, and branding.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-line/80 bg-white/80 p-6">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-ink/65">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" id="pricing">
        <h2 className="font-display text-3xl md:text-4xl">Simple pricing</h2>
        <p className="mt-2 text-ink/65">Start free. Upgrade when your chatbot earns its keep.</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {PLANS_COPY.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 ${
                plan.featured ? 'border-teal bg-white shadow-lg shadow-teal/10' : 'border-line/80 bg-white/70'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl">{plan.name}</h3>
                {plan.featured ? (
                  <span className="rounded-md bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal-dark">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-display text-4xl">
                ${plan.price}
                <span className="text-base font-sans text-ink/50">/mo</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink/70">
                {plan.perks.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              <Link to="/login" className="mt-6 block">
                <Button variant={plan.featured ? 'primary' : 'secondary'} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-12 text-sm text-ink/50 md:flex-row md:items-center md:justify-between">
        <BrandMark className="text-base opacity-80" />
        <p>Knowbase MVP · Docs → chatbot for SaaS teams</p>
      </footer>
    </div>
  )
}

function Bubble({ who, children }: { who: 'user' | 'bot'; children: ReactNode }) {
  const isUser = who === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'bg-teal text-white' : 'bg-white/10 text-white/90'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
