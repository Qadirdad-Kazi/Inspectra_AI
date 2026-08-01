'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardData = {
  windowDays: number;
  totals: {
    audits: number;
    averageScore: number | null;
    reportsReady: number;
    schedulesActive: number;
    findings: Record<string, number>;
  };
  auditsByStatus: Record<string, number>;
  scoreTrend: Array<{ date: string; averageScore: number }>;
  recentScores: Array<{ date: string; score: number; auditId: string; target: string }>;
};

export default function DashboardPage() {
  const { user, activeOrgId } = useAuth();
  const org = user?.organizations.find((o) => o.id === activeOrgId);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;
    void apiFetch<DashboardData>(`/organizations/${activeOrgId}/analytics/dashboard`, {
      orgId: activeOrgId,
    })
      .then(setData)
      .catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  const maxTrend = Math.max(1, ...(data?.scoreTrend.map((p) => p.averageScore) ?? [100]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted">
          Historical analytics for {org?.name ?? 'your organization'}
          {data ? ` · last ${data.windowDays} days` : ''}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Audits</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{data?.totals.audits ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg score</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data?.totals.averageScore ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reports ready</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data?.totals.reportsReady ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active schedules</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data?.totals.schedulesActive ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score trend</CardTitle>
            <CardDescription>Daily average overall score</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.scoreTrend.length ? (
              <p className="text-sm text-muted">No scored audits yet.</p>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {data.scoreTrend.slice(-24).map((p) => (
                  <div key={p.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${(p.averageScore / maxTrend) * 100}%` }}
                      title={`${p.date}: ${p.averageScore}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent scores</CardTitle>
            <CardDescription>Latest audit outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentScores ?? []).map((r) => (
              <Link
                key={r.auditId}
                href={`/audits/${r.auditId}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{r.target}</div>
                  <div className="text-xs text-muted">{r.date}</div>
                </div>
                <span className="tabular-nums font-semibold">{r.score}/100</span>
              </Link>
            ))}
            {!data?.recentScores.length ? (
              <p className="text-sm text-muted">Run an audit to populate history.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/audits">Start audit</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports">Report builder</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/automation">Automation</Link>
        </Button>
        {data?.auditsByStatus ? (
          <div className="flex flex-wrap items-center gap-2 pl-2">
            {Object.entries(data.auditsByStatus).map(([k, v]) => (
              <Badge key={k} className="capitalize">
                {k}: {v}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
