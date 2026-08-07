'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiDownload, apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuditRow = { id: string; status: string; asset?: { identifier: string }; scores?: { overall?: number } | null };
type ReportRow = {
  id: string;
  title: string;
  format: string;
  status: string;
  auditId: string;
  createdAt: string;
};
type Preview = {
  title: string;
  executiveSummary: string;
  overallScore: number;
  categoryScores: Array<{ label: string; score: number; weight: number }>;
  recommendations: Array<{
    title: string;
    priority: string;
    summary: string;
    effortEstimate: string;
    effortHoursHint: string;
    businessImpact?: { explanation: string };
    technicalImpact?: { explanation: string };
  }>;
  effortSummary: { estimatedHoursRange: string; totalItems: number };
};

const FORMATS = ['json', 'html', 'csv', 'sarif', 'pdf'] as const;

export default function ReportsPage() {
  const { activeOrgId } = useAuth();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [auditId, setAuditId] = useState('');
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('html');
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!activeOrgId) return;
    const [a, r] = await Promise.all([
      apiFetch<{ data: AuditRow[] }>(`/organizations/${activeOrgId}/audits?pageSize=50`, {
        orgId: activeOrgId,
      }),
      apiFetch<{ data: ReportRow[] }>(`/organizations/${activeOrgId}/reports?pageSize=50`, {
        orgId: activeOrgId,
      }),
    ]);
    setAudits(a.data.filter((x) => x.status === 'succeeded'));
    setReports(r.data);
    if (!auditId && a.data[0]) setAuditId(a.data.find((x) => x.status === 'succeeded')?.id ?? '');
  }

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  async function loadPreview() {
    if (!activeOrgId || !auditId) return;
    try {
      const doc = await apiFetch<Preview>(
        `/organizations/${activeOrgId}/reports/preview/${auditId}`,
        { orgId: activeOrgId },
      );
      setPreview(doc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview failed');
    }
  }

  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !auditId) return;
    setLoading(true);
    try {
      const report = await apiFetch<ReportRow>(`/organizations/${activeOrgId}/reports`, {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify({
          auditId,
          format,
          title: title || undefined,
        }),
      });
      toast.success(`Report queued (${report.format})`);
      setTimeout(() => void load(), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function download(reportId: string) {
    if (!activeOrgId) return;
    try {
      await apiDownload(`/organizations/${activeOrgId}/reports/${reportId}/content`, {
        orgId: activeOrgId,
      });
      toast.success('Download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted">
          Professional Report Builder with executive summary, category scores, recommendations, and
          effort estimates. Export JSON, HTML, CSV, SARIF, or printable HTML (for PDF).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Builder</CardTitle>
          <CardDescription>Select a completed audit, preview, then export.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={generate}>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="audit">Audit</Label>
              <select
                id="audit"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={auditId}
                onChange={(e) => setAuditId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset?.identifier ?? a.id}
                    {a.scores?.overall != null ? ` (${a.scores.overall})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="format">Export Format</Label>
              <select
                id="format"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={format}
                onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number])}
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f === 'pdf' ? 'Printable HTML (PDF)' : f.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q3 executive report"
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => void loadPreview()}>
                Preview
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Generating…' : 'Generate Export'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>{preview.title}</CardTitle>
            <CardDescription>
              Score {preview.overallScore}/100 · effort {preview.effortSummary.estimatedHoursRange}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>{preview.executiveSummary}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {preview.categoryScores.map((c) => (
                <div key={c.label} className="flex justify-between border-b border-border py-1">
                  <span>{c.label}</span>
                  <span className="tabular-nums font-medium">{c.score}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {preview.recommendations.slice(0, 6).map((r, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <Badge className="capitalize">{r.priority}</Badge>
                    <Badge>{r.effortEstimate}</Badge>
                    <span className="font-medium">{r.title}</span>
                  </div>
                  <p className="text-muted">{r.summary}</p>
                  <p className="mt-1 text-xs text-muted">{r.effortHoursHint}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted">No exports yet.</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted">
                    {r.format.toUpperCase()} · {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{r.status}</Badge>
                  {r.status === 'ready' ? (
                    <Button size="sm" variant="outline" onClick={() => void download(r.id)}>
                      Download
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
