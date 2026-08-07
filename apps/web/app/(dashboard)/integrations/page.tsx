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

type Integration = {
  id: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
};

export default function IntegrationsPage() {
  const { activeOrgId } = useAuth();
  const [rows, setRows] = useState<Integration[]>([]);
  const [slackUrl, setSlackUrl] = useState('');
  const [jira, setJira] = useState({
    baseUrl: '',
    email: '',
    apiToken: '',
    projectKey: '',
  });

  async function load() {
    if (!activeOrgId) return;
    const res = await apiFetch<{ data: Integration[] }>(
      `/organizations/${activeOrgId}/integrations`,
      { orgId: activeOrgId },
    );
    setRows(res.data);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  async function saveSlack(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    await apiFetch(`/organizations/${activeOrgId}/integrations`, {
      method: 'PUT',
      orgId: activeOrgId,
      body: JSON.stringify({
        type: 'slack',
        config: { webhookUrl: slackUrl },
      }),
    });
    toast.success('Slack integration saved');
    setSlackUrl('');
    await load();
  }

  async function saveJira(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    await apiFetch(`/organizations/${activeOrgId}/integrations`, {
      method: 'PUT',
      orgId: activeOrgId,
      body: JSON.stringify({ type: 'jira', config: jira }),
    });
    toast.success('Jira integration saved');
    await load();
  }

  async function test(type: string) {
    if (!activeOrgId) return;
    try {
      await apiFetch(`/organizations/${activeOrgId}/integrations/${type}/test`, {
        method: 'POST',
        orgId: activeOrgId,
      });
      toast.success(`${type} test succeeded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted">
          Slack notifications and Jira issue sync — modular connectors with retry + workflow logs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted">No integrations configured.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{r.type}</span>
                  <Badge className="capitalize">{r.status}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => void test(r.type)}>
                  Test
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slack</CardTitle>
          <CardDescription>Incoming webhook for audit completion alerts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={saveSlack}>
            <div className="space-y-1.5">
              <Label htmlFor="slack">Webhook URL</Label>
              <Input
                id="slack"
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                required
              />
            </div>
            <Button type="submit">Save Slack</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jira</CardTitle>
          <CardDescription>Create issues from findings / collaboration workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={saveJira}>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Base URL</Label>
              <Input
                value={jira.baseUrl}
                onChange={(e) => setJira({ ...jira, baseUrl: e.target.value })}
                placeholder="https://your-domain.atlassian.net"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={jira.email}
                onChange={(e) => setJira({ ...jira, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>API token</Label>
              <Input
                type="password"
                value={jira.apiToken}
                onChange={(e) => setJira({ ...jira, apiToken: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project Key</Label>
              <Input
                value={jira.projectKey}
                onChange={(e) => setJira({ ...jira, projectKey: e.target.value })}
                placeholder="ENG"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Save Jira</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
