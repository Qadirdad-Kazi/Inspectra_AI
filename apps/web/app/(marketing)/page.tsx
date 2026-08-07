import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AUDIT_PACKAGES, formatUsd } from '@/lib/packages';
import { STUDIO_PLANS, studioPlanPriceUsd } from '@/lib/studio-plans';

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
            <Link href="/#studio">Studio</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start Free</Link>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-900/80">
          Inspectra AI
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
          Paste a link.
          <span className="block text-teal-900">Get a clear audit.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Websites and app store listings — scored, prioritized, and explained in plain language.
          Then fix what the audit flags with{' '}
          <span className="font-medium text-slate-900">Inspectra Studio</span>: store-ready
          screenshot creatives for App Store, Play Store, MS Store, and web.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Start Free — 1 Live Audit</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Open Inspectra Studio</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          After signup, paste a website or Play / App Store / Microsoft Store link from your
          dashboard — or open Studio to build audit-safe store frames.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: 'One Paste',
              d: 'We detect the target type and run the right engine stack automatically.',
            },
            {
              t: 'Readable Report',
              d: 'Score, surface health, ranked fixes with concrete next steps — not a raw log dump.',
            },
            {
              t: 'Studio Creatives',
              d: 'Separate product: photoreal iPhone mockups, AI marketing copy, layout presets, and store-size PNG exports.',
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

      <section
        id="studio"
        className="relative z-10 border-t border-slate-200/80 bg-white/50 py-16"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-900">
              New · Inspectra Studio
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Screenshot Studio for store listings
            </h2>
            <p className="mt-2 text-slate-600">
              When an audit flags weak or missing screenshots, Studio helps you ship professional
              frames — device mockups, AI marketing copy, perspective-aligned uploads, and
              store-size PNG exports. Sold separately from audit credits.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'iPhone photoreal mockups · Android / tablet / desktop CSS frames',
              'AI marketing copy + layout presets (review before publishing)',
              'Fit, stretch, zoom & pan inside device glass',
              'Export at App Store / Play Store resolutions',
              'Weekly, Monthly, or Custom day-pass packages',
              'Org admins & platform admins included free',
            ].map((line) => (
              <li
                key={line}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sign-in">Try Inspectra Studio</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/#studio-packages">View Studio Packages</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="packages" className="relative z-10 border-t border-slate-200/80 py-16">
        <div className="mx-auto max-w-6xl px-6 space-y-14">
          <div>
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">Audit Packages</h2>
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
                      Most Popular
                    </p>
                  ) : (
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      One-Time
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
                  <Button
                    asChild
                    className="mt-6 w-full"
                    variant={pack.highlighted ? 'default' : 'outline'}
                  >
                    <Link href="/sign-up">Get {pack.name}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div id="studio-packages">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">Screenshot Studio Packages</h2>
              <p className="mt-2 text-slate-600">
                Separate product for store creatives. Does not include audit credits.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STUDIO_PLANS.map((plan) => {
                const price =
                  plan.interval === 'custom'
                    ? studioPlanPriceUsd(plan, 3)
                    : plan.priceUsd;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border bg-white p-6 shadow-sm ${
                      plan.highlighted
                        ? 'border-cyan-700/40 ring-1 ring-cyan-800/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {plan.highlighted ? (
                      <p className="text-xs font-medium uppercase tracking-wide text-cyan-800">
                        Most Popular
                      </p>
                    ) : (
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Access Pass
                      </p>
                    )}
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{plan.blurb}</p>
                    <div className="mt-6">
                      <div className="text-3xl font-semibold tabular-nums text-slate-950">
                        {formatUsd(price)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {plan.interval === 'custom'
                          ? 'From 1 day · $2.99/day'
                          : `${plan.durationDays} days of Studio access`}
                      </div>
                    </div>
                    <Button
                      asChild
                      className="mt-6 w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      <Link href="/sign-up">Get {plan.name}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        Inspectra AI · multi-target audits + Screenshot Studio for app stores
      </footer>
    </div>
  );
}
