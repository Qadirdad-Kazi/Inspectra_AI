'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { AuditReportView } from '@/components/report/audit-report-view';
import { mapAuditToReportModel } from '@/lib/map-audit-report';
import { saveCustomDemo, type DemoReport } from '@/lib/demo-reports';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Stage = { id: string; name: string; status: string; position: number };
type Finding = {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  remediation?: string | null;
};
type EventRow = { id: string; type: string; message?: string | null; createdAt: string };
type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string | null; email: string };
};
type AuditDetail = {
  id: string;
  status: string;
  errorMessage?: string | null;
  shareToken?: string | null;
  asset?: { identifier: string; type?: string; name?: string };
  stages: Stage[];
  scores?: {
    overall: number;
    engines?: Array<{ label: string; score: number; weight: number; contribution: number }>;
    modules?: Array<{ label: string; score: number; weight: number; contribution: number }>;
  } | null;
  aiReport?: {
    title: string;
    executiveSummary: string;
    recommendations: Array<{ priority: string; title: string; detail: string }>;
  } | null;
  storeReport?: {
    title: string;
    executiveSummary: string;
    highlights: string[];
  } | null;
  aiIntelligence?: {
    executiveSummary: string;
    recommendations?: Array<{
      id: string;
      agentId: string;
      priority: string;
      title: string;
      summary: string;
      technicalImpact: { explanation: string };
      actions: string[];
    }>;
  } | null;
  listing?: {
    title?: string;
    developer?: string;
    url?: string;
    rating?: number | null;
    ratingCount?: number | null;
    category?: string | null;
    subtitle?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    iconUrl?: string | null;
    screenshotUrls?: string[];
    downloads?: string | null;
  } | null;
};

export default function AuditDetailPage() {
  const params = useParams<{ auditId: string }>();
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [showOps, setShowOps] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!activeOrgId || !params.auditId) return;
    const detail = await apiFetch<AuditDetail>(
      `/organizations/${activeOrgId}/audits/${params.auditId}`,
      { orgId: activeOrgId },
    );
    setAudit(detail);
    if (detail.shareToken) {
      setShareUrl(`${window.location.origin}/r/${detail.shareToken}`);
    }

    const [f, e, c] = await Promise.all([
      apiFetch<{ data: Finding[] }>(
        `/organizations/${activeOrgId}/audits/${params.auditId}/findings?pageSize=100`,
        { orgId: activeOrgId },
      ),
      apiFetch<{ data: EventRow[] }>(
        `/organizations/${activeOrgId}/audits/${params.auditId}/events?pageSize=100`,
        { orgId: activeOrgId },
      ),
      apiFetch<{ data: CommentRow[] }>(
        `/organizations/${activeOrgId}/audits/${params.auditId}/comments`,
        { orgId: activeOrgId },
      ).catch(() => ({ data: [] as CommentRow[] })),
    ]);
    setFindings(f.data);
    setEvents(e.data);
    setComments(c.data);
  }, [activeOrgId, params.auditId]);

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [load]);

  useEffect(() => {
    if (!audit) return;
    if (['succeeded', 'failed', 'cancelled'].includes(audit.status)) return;
    const timer = setInterval(() => {
      void load().catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [audit?.status, load]);

  const model = useMemo(() => {
    if (!audit) return null;
    return mapAuditToReportModel(audit, findings);
  }, [audit, findings]);

  async function cancel() {
    if (!activeOrgId || !params.auditId) return;
    await apiFetch(`/organizations/${activeOrgId}/audits/${params.auditId}/cancel`, {
      method: 'POST',
      orgId: activeOrgId,
    });
    toast.message('Cancel requested');
    await load();
  }

  async function removeAudit() {
    if (!activeOrgId || !params.auditId || !audit) return;
    const label = audit.asset?.identifier ?? params.auditId;
    const ok = window.confirm(
      `Delete audit for “${label}”? This permanently removes findings, reports, events, and comments from the database.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch(`/organizations/${activeOrgId}/audits/${params.auditId}`, {
        method: 'DELETE',
        orgId: activeOrgId,
      });
      toast.success('Audit deleted');
      router.replace('/audits');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  async function rerunIntelligence() {
    if (!activeOrgId || !params.auditId) return;
    try {
      await apiFetch(`/organizations/${activeOrgId}/audits/${params.auditId}/intelligence`, {
        method: 'POST',
        orgId: activeOrgId,
      });
      toast.success('AI intelligence refreshed');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Intelligence run failed');
    }
  }

  async function enableShare() {
    if (!activeOrgId || !params.auditId) return;
    try {
      const res = await apiFetch<{ shareToken: string; path: string }>(
        `/organizations/${activeOrgId}/audits/${params.auditId}/share`,
        { method: 'POST', orgId: activeOrgId },
      );
      const url = `${window.location.origin}${res.path}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success('Public link copied');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create share link');
    }
  }

  async function revokeShare() {
    if (!activeOrgId || !params.auditId) return;
    await apiFetch(`/organizations/${activeOrgId}/audits/${params.auditId}/unshare`, {
      method: 'POST',
      orgId: activeOrgId,
    });
    setShareUrl(null);
    toast.message('Share link revoked');
    await load();
  }

  function saveAsDemo() {
    if (!audit || !model) return;
    const demo: DemoReport = {
      id: `from-audit-${audit.id}`,
      title: model.title,
      subtitle: model.subtitle ?? 'Saved from live audit',
      kind: audit.asset?.type === 'web' ? 'web' : 'store',
      targetLabel: audit.asset?.identifier ?? audit.id,
      score: model.score ?? 0,
      summary: model.summary ?? '',
      surfaces: model.surfaces.map((s) => ({
        id: s.id,
        label: s.label,
        status: (s.status === 'strong' || s.status === 'weak' ? s.status : 'needs_work') as
          | 'strong'
          | 'needs_work'
          | 'weak',
        note: s.note ?? '',
      })),
      findings: model.findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: (['critical', 'high', 'medium', 'low', 'info'].includes(f.severity)
          ? f.severity
          : 'medium') as DemoReport['findings'][0]['severity'],
        category: f.category,
        description: f.description,
        remediation: f.remediation ?? undefined,
        impactPoints: f.impactPoints,
      })),
      strengths: model.strengths,
      listing: {
        developer: model.listing?.developer ?? undefined,
        category: model.listing?.category ?? undefined,
      },
    };
    saveCustomDemo(demo);
    toast.success('Saved as a local draft on this device (not published)');
  }

  async function postComment() {
    if (!activeOrgId || !params.auditId || !commentBody.trim()) return;
    await apiFetch(`/organizations/${activeOrgId}/audits/${params.auditId}/comments`, {
      method: 'POST',
      orgId: activeOrgId,
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    setCommentBody('');
    toast.success('Comment added');
    await load();
  }

  if (!audit || !model) {
    return <p className="text-muted">Loading audit…</p>;
  }

  const running = model.running;
  const finished = ['succeeded', 'failed'].includes(audit.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/audits" className="text-sm text-muted hover:text-foreground">
          ← All audits
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowOps((v) => !v)}>
            {showOps ? 'Hide ops' : 'Progress & ops'}
          </Button>
          {finished ? (
            <>
              <Button variant="outline" size="sm" onClick={() => void enableShare()}>
                {shareUrl ? 'Copy share link' : 'Share public link'}
              </Button>
              {shareUrl ? (
                <Button variant="outline" size="sm" onClick={() => void revokeShare()}>
                  Unshare
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={saveAsDemo}>
                Save draft locally
              </Button>
              <Button variant="outline" size="sm" onClick={() => void rerunIntelligence()}>
                Re-run AI
              </Button>
            </>
          ) : null}
          {running ? (
            <Button variant="outline" size="sm" onClick={() => void cancel()}>
              Cancel
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-red-50"
            disabled={deleting}
            onClick={() => void removeAudit()}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      {shareUrl ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
          Public link:{' '}
          <a href={shareUrl} className="font-medium underline" target="_blank" rel="noreferrer">
            {shareUrl}
          </a>
        </div>
      ) : null}

      {audit.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-destructive">{audit.errorMessage}</CardContent>
        </Card>
      ) : null}

      {showOps ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Pipeline stages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(audit.stages?.length ? audit.stages : []).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{s.name.replace(/_/g, ' ')}</span>
                  <Badge className="capitalize">{s.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Event log</CardTitle>
            </CardHeader>
            <CardContent className="max-h-48 space-y-2 overflow-auto text-xs">
              {events.map((e) => (
                <div key={e.id} className="flex gap-3 border-b border-border/60 pb-2">
                  <span className="shrink-0 text-muted">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </span>
                  <span>
                    <span className="font-medium">{e.type}</span>
                    {e.message ? ` — ${e.message}` : ''}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AuditReportView
        model={model}
        footer={
          <Card>
            <CardHeader>
              <CardTitle>Team notes</CardTitle>
              <CardDescription>Keep discussion next to the report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="flex h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <Button type="button" onClick={() => void postComment()}>
                  Post
                </Button>
              </div>
              {comments.length === 0 ? (
                <p className="text-sm text-muted">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="mb-1 text-xs text-muted">
                      {c.author.name || c.author.email} · {new Date(c.createdAt).toLocaleString()}
                    </div>
                    <p>{c.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
