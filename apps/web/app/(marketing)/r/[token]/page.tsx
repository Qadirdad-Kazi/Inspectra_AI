'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuditReportView } from '@/components/report/audit-report-view';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/api';
import { mapAuditToReportModel, type AuditLike } from '@/lib/map-audit-report';

type PublicPayload = AuditLike & {
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description: string;
    remediation?: string | null;
  }>;
};

export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/v1/public/reports/${params.token}`);
        if (!res.ok) {
          throw new Error('Shared report not found or revoked');
        }
        const json = (await res.json()) as PublicPayload;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  const model = useMemo(() => {
    if (!data) return null;
    return mapAuditToReportModel(data, data.findings);
  }, [data]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1eb] px-6">
        <div className="text-center">
          <p className="text-slate-600">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1eb] text-slate-500">
        Loading shared report…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      <div className="border-b border-slate-900 bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
          <p>
            Shared Inspectra report · read-only. Paste your own link to generate a live audit.
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
        <Button asChild>
          <Link href="/sign-up">Start free</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <AuditReportView model={model} />
      </main>
    </div>
  );
}
