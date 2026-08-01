'use client';

import { cn } from '@/lib/utils';
import { scoreBand, toTenScale } from '@/lib/demo-reports';

type Severity = string;

export type ReportFinding = {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  description: string;
  remediation?: string | null;
  impactPoints?: number;
};

export type ReportSurface = {
  id: string;
  label: string;
  status: 'strong' | 'needs_work' | 'weak' | string;
  note?: string;
  score?: number;
};

export type AuditReportModel = {
  title: string;
  subtitle?: string;
  targetLabel?: string;
  statusBadge?: string;
  score: number | null;
  summary?: string | null;
  /** Short product blurb (store description / AI about) */
  about?: string | null;
  surfaces: ReportSurface[];
  findings: ReportFinding[];
  strengths: Array<{ title: string; detail: string }>;
  listing?: {
    developer?: string | null;
    category?: string | null;
    meta?: string[];
    url?: string | null;
    iconUrl?: string | null;
    screenshotUrls?: string[];
    shortDescription?: string | null;
  };
  running?: boolean;
};

function severityRank(s: string): number {
  const m: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };
  return m[s.toLowerCase()] ?? 0;
}

function severityTone(s: string) {
  const v = s.toLowerCase();
  if (v === 'critical' || v === 'high') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (v === 'medium') return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function surfaceDot(status: string) {
  if (status === 'strong') return 'bg-teal-600';
  if (status === 'needs_work') return 'bg-amber-500';
  if (status === 'weak') return 'bg-rose-500';
  return 'bg-slate-400';
}

function ScoreRing({ score }: { score: number }) {
  const ten = Number(toTenScale(score));
  const band = scoreBand(score);
  const pct = Math.max(0, Math.min(100, score));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const stroke =
    band.tone === 'strong' ? '#0f766e' : band.tone === 'fair' ? '#d97706' : '#e11d48';

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
              {ten}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">/ 10</div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          Inspectra score
        </div>
        <div
          className={cn(
            'mt-1 inline-flex rounded-md px-2 py-0.5 text-sm font-medium',
            band.tone === 'strong' && 'bg-teal-50 text-teal-800',
            band.tone === 'fair' && 'bg-amber-50 text-amber-900',
            band.tone === 'weak' && 'bg-rose-50 text-rose-800',
          )}
        >
          {band.label}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {score}
          <span className="text-slate-400"> / 100 weighted</span>
        </p>
      </div>
    </div>
  );
}

export function AuditReportView({
  model,
  headerActions,
  footer,
}: {
  model: AuditReportModel;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const findings = [...model.findings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
  const counts = findings.reduce(
    (acc, f) => {
      const k = f.severity.toLowerCase();
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const potential = findings.reduce((n, f) => n + (f.impactPoints ?? 0), 0);
  const goodSurfaces = model.surfaces.filter((s) => s.status === 'strong').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">
            Audit report
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            {model.title}
          </h1>
          {model.subtitle ? <p className="mt-1 text-slate-600">{model.subtitle}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            {model.targetLabel ? (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1">
                {model.targetLabel}
              </span>
            ) : null}
            {model.statusBadge ? (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 capitalize">
                {model.statusBadge}
              </span>
            ) : null}
          </div>
        </div>
        {headerActions}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          {model.score != null ? (
            <ScoreRing score={model.score} />
          ) : (
            <p className="text-sm text-slate-500">
              {model.running ? 'Scoring in progress…' : 'Score unavailable'}
            </p>
          )}
          {potential > 0 ? (
            <p className="mt-4 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-950">
              <span className="font-semibold">+{(potential / 10).toFixed(1)}</span> potential on the
              10-point scale with {findings.length} prioritized fix
              {findings.length === 1 ? '' : 'es'}.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Issues found
          </div>
          <div className="mt-2 text-4xl font-semibold tabular-nums text-slate-950">
            {findings.length}
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
            {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
              const n = counts[sev] ?? 0;
              if (!n || !findings.length) return null;
              const colors: Record<string, string> = {
                critical: 'bg-rose-700',
                high: 'bg-rose-500',
                medium: 'bg-amber-500',
                low: 'bg-slate-400',
              };
              return (
                <div
                  key={sev}
                  className={colors[sev]}
                  style={{ width: `${(n / findings.length) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>{(counts.critical ?? 0) + (counts.high ?? 0)} high</span>
            <span>{counts.medium ?? 0} medium</span>
            <span>{counts.low ?? 0} low</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Surface health
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {goodSurfaces} of {model.surfaces.length || '—'} surfaces looking good
          </p>
          <ul className="mt-4 space-y-2">
            {model.surfaces.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', surfaceDot(s.status))} />
                <div>
                  <div className="font-medium text-slate-900">
                    {s.label}
                    {s.score != null ? (
                      <span className="ml-2 text-xs font-normal text-slate-500">{s.score}</span>
                    ) : null}
                  </div>
                  {s.note ? <div className="text-xs text-slate-500">{s.note}</div> : null}
                </div>
              </li>
            ))}
            {!model.surfaces.length ? (
              <li className="text-sm text-slate-500">Surfaces appear when the run finishes.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            {model.listing?.iconUrl ? (
              <img
                src={model.listing.iconUrl}
                alt=""
                className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                {(model.title[0] ?? 'I').toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{model.title}</h2>
              {model.listing?.developer ? (
                <p className="text-sm text-slate-500">{model.listing.developer}</p>
              ) : null}
              {model.listing?.shortDescription ? (
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {model.listing.shortDescription}
                </p>
              ) : null}
              {model.summary ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{model.summary}</p>
              ) : null}
              {model.listing?.meta?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {model.listing.meta.map((m) => (
                    <span
                      key={m}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}
              {model.listing?.url ? (
                <a
                  href={model.listing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-teal-800 hover:underline"
                >
                  View live listing →
                </a>
              ) : null}
            </div>
          </div>

          {model.listing?.screenshotUrls?.length ? (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Creative frames
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {model.listing.screenshotUrls.map((src, i) => {
                  const badge = findings[i] ? i + 1 : null;
                  return (
                    <a
                      key={src}
                      href={badge ? `#finding-${findings[i]!.id}` : undefined}
                      className="relative shrink-0"
                    >
                      <img
                        src={src}
                        alt={`Screenshot ${i + 1}`}
                        className="h-48 w-28 rounded-xl border border-slate-200 object-cover object-top"
                      />
                      {badge ? (
                        <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                          {badge}
                        </span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Numbered frames map to the first priority actions on the right.
              </p>
            </div>
          ) : null}

          {model.about ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Product snapshot
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{model.about}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Priority actions ({findings.length})
            </h3>
          </div>
          {findings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
              {model.running
                ? 'Findings will appear as engines finish.'
                : 'No prioritized findings on this run.'}
            </div>
          ) : (
            findings.map((f, idx) => (
              <article
                key={f.id}
                id={`finding-${f.id}`}
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {idx + 1}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                      severityTone(f.severity),
                    )}
                  >
                    {f.severity}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600">
                    {f.category.replace(/_/g, ' ')}
                  </span>
                  {f.impactPoints != null ? (
                    <span className="text-xs font-medium text-teal-800">
                      +{(f.impactPoints / 10).toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <h4 className="font-semibold text-slate-950">{f.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{f.description}</p>
                {f.remediation ? (
                  <div className="mt-3 rounded-xl bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <span className="font-semibold text-teal-300">Fix · </span>
                    {f.remediation}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>

      {model.strengths.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Working well ({model.strengths.length})
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {model.strengths.map((s) => (
              <div key={s.title} className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <div className="font-medium text-slate-900">{s.title}</div>
                <p className="mt-1 text-sm text-slate-600">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {model.surfaces.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Surface benchmark
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Element-by-element read against Inspectra’s quality bar — a second pass beyond the AI
            summary.
          </p>
          <ul className="mt-4 divide-y divide-slate-100">
            {model.surfaces.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-medium text-slate-900">{s.label}</div>
                  {s.note ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{s.note}</p> : null}
                </div>
                <span
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium capitalize',
                    s.status === 'strong' && 'bg-teal-50 text-teal-800',
                    s.status === 'needs_work' && 'bg-amber-50 text-amber-900',
                    s.status === 'weak' && 'bg-rose-50 text-rose-800',
                  )}
                >
                  {String(s.status).replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {footer}
    </div>
  );
}
