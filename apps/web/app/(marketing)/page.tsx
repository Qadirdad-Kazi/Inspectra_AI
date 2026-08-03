import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BUILTIN_DEMOS, toTenScale } from '@/lib/demo-reports';
import { AUDIT_PACKAGES, formatUsd } from '@/lib/packages';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#f4f1eb] text-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_20%_0%,rgba(15,118,110,0.18),transparent_55%),radial-gradient(ellipse_at_90%_10%,rgba(15,23,42,0.08),transparent_45%)]"
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Inspectra<span className="text-teal-800">.</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost">
            <Link href="/#packages">Packages</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/demo">Demos</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start free</Link>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pt-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-900/80">
          Inspectra AI
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
          Paste a link.
          <span className="block text-teal-900">Get a clear audit.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Websites and app store listings — scored, prioritized, and explained in plain language.
          New workspaces include 1 free live audit; browse demos with no account.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Start free — 1 live audit</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/demo">Browse sample reports</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          After signup, paste a website or Play / App Store / Microsoft Store link from your
          dashboard.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: 'One paste',
              d: 'We detect the target type and run the right engine stack automatically.',
            },
            {
              t: 'Readable report',
              d: 'Score, surface health, ranked fixes with concrete next steps — not a raw log dump.',
            },
            {
              t: 'Team-ready',
              d: 'Orgs, schedules, Slack/Jira, API keys, and exports when you outgrow a one-off check.',
            },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur"
            >
              <div className="text-sm font-semibold text-slate-950">{item.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-slate-200/80 bg-white/50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Explore sample reports</h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Client-side demos — no login. See how Inspectra presents findings before you run a
                live audit.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/demo">All demos</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {BUILTIN_DEMOS.map((demo) => (
              <Link
                key={demo.id}
                href={`/demo/${demo.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-700/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {demo.kind === 'web' ? 'Website' : 'Store listing'}
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-tight group-hover:text-teal-900">
                      {demo.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{demo.subtitle}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
                    <div className="text-xl font-semibold tabular-nums">
                      {toTenScale(demo.score)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">/10</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="relative z-10 border-t border-slate-200/80 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">Packages</h2>
            <p className="mt-2 text-slate-600">
              Buy audit credits once. They never expire. No monthly subscription.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {AUDIT_PACKAGES.map((pack) => (
              <div
                key={pack.id}
                className={`rounded-2xl border bg-white p-6 shadow-sm ${
                  pack.highlighted
                    ? 'border-teal-700/50 ring-1 ring-teal-800/10'
                    : 'border-slate-200'
                }`}
              >
                {pack.highlighted ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
                    Most popular
                  </p>
                ) : (
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    One-time
                  </p>
                )}
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{pack.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{pack.blurb}</p>
                <div className="mt-6">
                  <div className="text-3xl font-semibold tabular-nums text-slate-950">
                    {formatUsd(pack.priceUsd)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {pack.audits} audits · never expires
                  </div>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  <li>{pack.audits} website or store audits</li>
                  <li>Credits never expire</li>
                  <li>No subscription</li>
                </ul>
                <Button asChild className="mt-6 w-full" variant={pack.highlighted ? 'default' : 'outline'}>
                  <Link href="/sign-up">Get {pack.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        Inspectra AI · multi-target audits for websites and app stores
      </footer>
    </div>
  );
}
