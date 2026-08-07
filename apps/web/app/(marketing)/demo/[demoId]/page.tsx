'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { AuditReportView } from '@/components/report/audit-report-view';
import { Button } from '@/components/ui/button';
import { BUILTIN_DEMOS, getDemoById } from '@/lib/demo-reports';

export default function DemoReportPage() {
  const params = useParams<{ demoId: string }>();
  const demoId = params.demoId;

  // Prefer built-ins synchronously (SSR + first paint); custom demos hydrate from localStorage via getDemoById
  const demo = useMemo(() => {
    const builtin = BUILTIN_DEMOS.find((d) => d.id === demoId);
    if (builtin) return builtin;
    if (typeof window === 'undefined') return null;
    return getDemoById(demoId);
  }, [demoId]);

  const model = useMemo(() => {
    if (!demo) return null;
    return {
      title: demo.title,
      subtitle: demo.subtitle,
      targetLabel: demo.targetLabel,
      statusBadge: 'demo',
      score: demo.score,
      summary: demo.summary,
      about: demo.listing?.description ?? null,
      surfaces: demo.surfaces,
      findings: demo.findings,
      strengths: demo.strengths,
      listing: {
        developer: demo.listing?.developer,
        category: demo.listing?.category,
        shortDescription: demo.listing?.shortDescription,
        iconUrl: demo.listing?.iconUrl,
        screenshotUrls: demo.listing?.screenshotUrls,
        meta: [demo.listing?.rating, demo.listing?.downloads, demo.listing?.category].filter(
          Boolean,
        ) as string[],
      },
    };
  }, [demo]);

  if (!demo || !model) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1eb] px-6">
        <div className="text-center">
          <p className="text-slate-600">Sample not found — published samples are coming soon.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/sign-up">Start Free Audit</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      <div className="border-b border-slate-900 bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
          <p>
            You are viewing a{' '}
            <span className="font-medium text-teal-300">sample Inspectra report</span>. Live audits
            take about a minute after you paste a link.
          </p>
          <Button asChild size="sm" className="bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/">Audit my target →</Link>
          </Button>
        </div>
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Inspectra<span className="text-teal-800">.</span>
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/demo">Sample Reports</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <AuditReportView model={model} />
      </main>
    </div>
  );
}
