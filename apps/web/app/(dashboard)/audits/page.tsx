'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { QuickAuditBar } from '@/components/scans/quick-audit-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  clearPendingTarget,
  readPendingTarget,
  type DetectedTarget,
} from '@/lib/detect-target';

type AuditRow = {
  id: string;
  status: string;
  createdAt: string;
  asset?: { identifier: string; name: string; type?: string };
  scores?: { overall?: number } | null;
};

function AuditsInner() {
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    if (!activeOrgId) return;
    const res = await apiFetch<{ data: AuditRow[] }>(`/organizations/${activeOrgId}/audits`, {
      orgId: activeOrgId,
    });
    setAudits(res.data);
  }

  async function removeAudit(auditId: string, label: string) {
    if (!activeOrgId) return;
    const ok = window.confirm(
      `Delete audit for “${label}”? This permanently removes findings, reports, events, and comments from the database.`,
    );
    if (!ok) return;
    setDeletingId(auditId);
    try {
      await apiFetch(`/organizations/${activeOrgId}/audits/${auditId}`, {
        method: 'DELETE',
        orgId: activeOrgId,
      });
      toast.success('Audit deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  useEffect(() => {
    const pending = readPendingTarget();
    if (!pending) return;
    setPendingLabel(`${pending.label}: ${pending.value}`);
    if (search.get('autostart') === '1' && activeOrgId) {
      void autoStart(pending);
    }
  }, [activeOrgId, search]);

  async function autoStart(target: DetectedTarget) {
    if (!activeOrgId) return;
    try {
      const body =
        target.kind === 'web'
          ? {
              type: 'web' as const,
              url: target.value,
              config: { maxPages: 12, maxDepth: 2, requestDelayMs: 300 },
            }
          : {
              type: target.kind,
              storeIdentifier: target.value,
              config: { country: 'us', maxReviews: 25 },
            };
      const audit = await apiFetch<{ id: string }>(`/organizations/${activeOrgId}/audits`, {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify(body),
      });
      clearPendingTarget();
      toast.success('Audit started from your pasted link');
      router.replace(`/audits/${audit.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auto-start failed');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Audits</h1>
        <p className="mt-1 text-muted">
          Paste a link — Inspectra detects website vs store and runs the full pipeline.
        </p>
      </div>

      {pendingLabel ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
          Pending from landing page: <span className="font-medium">{pendingLabel}</span>
          <Button
            size="sm"
            className="ml-3"
            onClick={() => {
              const p = readPendingTarget();
              if (p) void autoStart(p);
            }}
          >
            Run now
          </Button>
        </div>
      ) : null}

      <QuickAuditBar size="compact" />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Recent
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? 'Hide tips' : 'Tips'}
        </Button>
      </div>

      {advanced ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported targets</CardTitle>
            <CardDescription>
              Website URLs · Google Play package / URL · App Store ID / URL · Microsoft Store ID /
              URL. Public hosts only (private IPs blocked).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            Prefer the paste bar above. For walkthroughs without a live run, open{' '}
            <Link href="/demo" className="font-medium text-teal-800 hover:underline">
              sample demos
            </Link>
            .
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Newest first — open any row for the full report. Delete removes it from the database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {audits.length === 0 ? (
            <p className="text-sm text-muted">No audits yet. Paste a link above to begin.</p>
          ) : (
            audits.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm transition hover:border-teal-700/30 hover:bg-white"
              >
                <Link href={`/audits/${a.id}`} className="min-w-0 flex-1">
                  <div className="font-medium truncate">{a.asset?.identifier ?? a.id}</div>
                  <div className="text-xs text-muted">
                    {a.asset?.type ? `${a.asset.type} · ` : ''}
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {a.scores?.overall != null ? (
                    <span className="font-semibold tabular-nums">{a.scores.overall}/100</span>
                  ) : null}
                  <Badge className="capitalize">{a.status}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-red-50"
                    disabled={deletingId === a.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void removeAudit(a.id, a.asset?.identifier ?? a.id);
                    }}
                  >
                    {deletingId === a.id ? '…' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading audits…</p>}>
      <AuditsInner />
    </Suspense>
  );
}
