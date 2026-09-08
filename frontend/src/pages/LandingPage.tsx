import { Link } from 'react-router-dom'
import { BrandMark, Button } from '../components/ui'
import { PLANS_COPY } from '../lib/pricing'
import { useAuth } from '../lib/auth'
import { HeroChatDemo } from '../components/HeroChatDemo'

export function LandingPage() {
  const { session, loading } = useAuth()
  const signedIn = !loading && !!session
  const ctaTo = signedIn ? '/app' : '/login'

  return (
    <div className="kb-page min-h-screen overflow-x-hidden text-ink">
      {/* —— Hero + Workflow share one continuous background —— */}
      <div className="relative">
        <div aria-hidden className="kb-hero-grid pointer-events-none absolute inset-x-0 top-0 h-[70vh]" />
        <div
          aria-hidden
          className="kb-float pointer-events-none absolute left-[-8%] top-[12%] h-72 w-72 rounded-full bg-teal/15 blur-3xl"
        />
        <div
          aria-hidden
          className="kb-drift pointer-events-none absolute right-[-6%] top-[8%] h-64 w-64 rounded-full bg-teal/10 blur-3xl"
        />

        <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <BrandMark />
          <nav className="hidden items-center gap-1 text-sm font-medium text-ink/60 md:flex">
            <a href="#how" className="rounded-lg px-3 py-2 transition hover:bg-white/70 hover:text-ink">
              How it works
            </a>
            <a href="#features" className="rounded-lg px-3 py-2 transition hover:bg-white/70 hover:text-ink">
              Features
            </a>
            <a href="#pricing" className="rounded-lg px-3 py-2 transition hover:bg-white/70 hover:text-ink">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link to="/app">
                <Button>Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink/65 transition hover:bg-white/70 hover:text-ink sm:inline-block"
                >
                  Sign in
                </Link>
                <Link to="/login">
                  <Button>Start free</Button>
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20 lg:pt-14">
          <div className="max-w-xl">
            <p className="kb-rise text-[13px] font-semibold uppercase tracking-[0.22em] text-teal-dark/75">
              Knowbase
            </p>
            <h1 className="kb-rise kb-rise-1 mt-4 font-display text-[2.75rem] leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.75rem]">
              Your docs.
              <br />
              <span className="text-teal-dark">Their answers.</span>
            </h1>
            <p className="kb-rise kb-rise-2 mt-5 max-w-md text-base leading-relaxed text-ink/65 sm:text-lg">
              Turn product documentation into a support chatbot — in your app and on your website,
              with citations back to the source.
            </p>
            <div className="kb-rise kb-rise-3 mt-8 flex flex-wrap items-center gap-3">
              <Link to={ctaTo}>
                <Button className="px-5 py-3 text-base shadow-md shadow-teal/15 transition hover:-translate-y-0.5">
                  {signedIn ? 'Open your bots' : 'Start building free'}
                </Button>
              </Link>
              <a href="#how">
                <Button variant="secondary" className="px-5 py-3 text-base">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          <div className="kb-rise kb-rise-2">
            <HeroChatDemo />
          </div>
        </section>

        <section id="how" className="relative z-10 px-4 pb-20 pt-8 md:pb-24 md:pt-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark/70">Workflow</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl tracking-tight md:text-4xl">
              From help center to live widget in minutes
            </h2>
            <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
              {[
                {
                  step: '01',
                  title: 'Upload knowledge',
                  body: 'Drop PDF, Markdown, or TXT from your docs. We extract, chunk, and embed automatically.',
                },
                {
                  step: '02',
                  title: 'Tune the assistant',
                  body: 'Test answers in a ChatGPT-style playground. Every reply can cite the source chunk.',
                },
                {
                  step: '03',
                  title: 'Embed anywhere',
                  body: 'Publish and paste one script tag. Your users get instant, grounded support.',
                },
              ].map((item, i) => (
                <div key={item.step} className="relative">
                  {i < 2 ? (
                    <div
                      aria-hidden
                      className="absolute left-[4.5rem] right-[-1.5rem] top-5 hidden h-px bg-gradient-to-r from-line via-line to-transparent md:block"
                    />
                  ) : null}
                  <span className="font-display text-5xl leading-none text-teal/25">{item.step}</span>
                  <h3 className="mt-4 font-display text-2xl tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* —— Features —— */}
      <section id="features" className="px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark/70">Why Knowbase</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
              Built for teams who care that answers are true
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink/60">
              Not another generic chatbot. A focused tool for SaaS docs, help centers, and product manuals.
            </p>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <FeatureBlock
              title="Grounded with citations"
              body="Answers pull from your uploaded knowledge. Each response can show which document chunk was used — so support stays verifiable."
            />
            <FeatureBlock
              title="Playground that feels familiar"
              body="Iterate on system prompts and docs the same way you chat with ChatGPT — then ship the same brain as a widget."
            />
            <FeatureBlock
              title="One-line embed"
              body="A floating assistant for marketing sites and docs portals. Free plans keep a small watermark; Pro removes it and unlocks branding."
            />
            <FeatureBlock
              title="Pricing that matches growth"
              body="Start free with real limits. Upgrade when you need more bots, storage, messages, and custom brand color."
            />
          </div>
        </div>
      </section>

      {/* —— Pricing —— */}
      <section id="pricing" className="px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark/70">Pricing</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">Simple plans. Clear gates.</h2>
            <p className="mt-3 text-ink/60">Start free. Upgrade when the chatbot is earning its keep.</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PLANS_COPY.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl p-7 transition duration-300 ${
                  plan.featured
                    ? 'bg-ink text-white shadow-2xl shadow-ink/20 lg:-translate-y-2'
                    : 'border border-line/80 bg-white/80 hover:-translate-y-1 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-2xl">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="rounded-md bg-teal/25 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 font-display text-4xl tracking-tight">
                  ${plan.price}
                  <span className={`text-base font-sans font-normal ${plan.featured ? 'text-white/45' : 'text-ink/45'}`}>
                    /mo
                  </span>
                </p>
                <ul className={`mt-6 flex-1 space-y-2.5 text-sm ${plan.featured ? 'text-white/70' : 'text-ink/65'}`}>
                  {plan.perks.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className={plan.featured ? 'text-white/90' : 'text-teal'}>✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link to={signedIn ? '/app/billing' : '/login'} className="mt-8 block">
                  <Button
                    variant={plan.featured ? 'primary' : 'secondary'}
                    className={`w-full ${plan.featured ? 'bg-teal hover:bg-teal-dark' : ''}`}
                  >
                    {signedIn && plan.id !== 'free' ? 'Upgrade' : plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— Closing —— */}
      <section className="px-4 pb-16 pt-4 md:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-line/50 pt-12 md:flex-row md:items-end md:justify-between md:gap-10 md:pt-14">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl tracking-tight md:text-3xl">
              Ready to turn your docs into answers?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/60 md:text-base">
              Create a bot, upload a help article, and embed the widget — usually in under ten minutes.
            </p>
          </div>
          <Link to={ctaTo} className="shrink-0">
            <Button className="px-5 py-3 text-base">
              {signedIn ? 'Open dashboard' : 'Start free'}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-line/50 px-4 py-10 text-sm text-ink/45 md:flex-row md:items-center md:justify-between">
        <BrandMark className="text-base opacity-80" />
        <p>Knowbase · Docs → chatbot for SaaS teams</p>
      </footer>
    </div>
  )
}

function FeatureBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-line pt-6">
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">{body}</p>
    </div>
  )
}
