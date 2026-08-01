'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Asset = { id: string; name: string; identifier: string; type: string };
type Schedule = {
  id: string;
  name: string;
  intervalMinutes: number;
  isActive: boolean;
  nextRunAt: string | null;
  lastStatus: string | null;
  asset?: { identifier: string; type: string } | null;
};
type LogRow = {
  id: string;
  workflowType: string;
  status: string;
  message?: string | null;
  attempt: number;
  createdAt: string;
};

export default function AutomationPage() {
  const { activeOrgId } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [name, setName] = useState('Weekly audit');
  const [assetId, setAssetId] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(10080);

  async function load() {
    if (!activeOrgId) return;
    const [a, s, l] = await Promise.all([
      apiFetch<{ data: Asset[] }>(`/organizations/${activeOrgId}/assets?pageSize=50`, {
        orgId: activeOrgId,
      }),
      apiFetch<{ data: Schedule[] }>(`/organizations/${activeOrgId}/schedules`, {
        orgId: activeOrgId,
      }),
      apiFetch<{ data: LogRow[] }>(
        `/organizations/${activeOrgId}/analytics/workflow-logs?limit=30`,
        { orgId: activeOrgId },
      ).catch(() => ({ data: [] as LogRow[] })),
    ]);
    setAssets(a.data);
    setSchedules(s.data);
    setLogs(l.data);
    if (!assetId && a.data[0]) setAssetId(a.data[0].id);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    await apiFetch(`/organizations/${activeOrgId}/schedules`, {
      method: 'POST',
      orgId: activeOrgId,
      body: JSON.stringify({ name, assetId, intervalMinutes }),
    });
    toast.success('Schedule created');
    await load();
  }

  async function runNow(id: string) {
    if (!activeOrgId) return;
    await apiFetch(`/organizations/${activeOrgId}/schedules/${id}/run`, {
      method: 'POST',
      orgId: activeOrgId,
    });
    toast.success('Schedule triggered');
    await load();
  }

  async function dispatchDue() {
    if (!activeOrgId) return;
    const res = await apiFetch<{ processed: number }>(
      `/organizations/${activeOrgId}/schedules/dispatch/due`,
      { method: 'POST', orgId: activeOrgId },
    );
    toast.success(`Processed ${res.processed} due schedule(s)`);
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
          <p className="text-muted">
            Scheduled audits with retries and structured workflow logging.
          </p>
        </div>
        <Button variant="outline" onClick={() => void dispatchDue()}>
          Run due now
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New schedule</CardTitle>
          <CardDescription>Minimum interval 60 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Interval (minutes)</Label>
              <Input
                type="number"
                min={60}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Asset</Label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type} · {a.identifier}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button type="submit">Create schedule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {schedules.length === 0 ? (
            <p className="text-sm text-muted">No schedules yet.</p>
          ) : (
            schedules.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted">
                    {s.asset?.identifier} · every {s.intervalMinutes}m · next{' '}
                    {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{s.isActive ? 'active' : 'paused'}</Badge>
                  {s.lastStatus ? <Badge className="capitalize">{s.lastStatus}</Badge> : null}
                  <Button size="sm" variant="outline" onClick={() => void runNow(s.id)}>
                    Run
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow logs</CardTitle>
          <CardDescription>Retry attempts and outcomes for automated jobs.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-72 space-y-2 overflow-auto text-xs">
          {logs.length === 0 ? (
            <p className="text-sm text-muted">No workflow activity yet.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex gap-3 border-b border-border/60 pb-2">
                <span className="shrink-0 text-muted">
                  {new Date(l.createdAt).toLocaleTimeString()}
                </span>
                <span>
                  <span className="font-medium">{l.workflowType}</span> · {l.status} · attempt{' '}
                  {l.attempt}
                  {l.message ? ` — ${l.message}` : ''}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
