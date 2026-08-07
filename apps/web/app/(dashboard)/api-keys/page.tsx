'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

export default function ApiManagementPage() {
  const { activeOrgId } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState('CI pipeline');
  const [created, setCreated] = useState<string | null>(null);

  async function load() {
    if (!activeOrgId) return;
    const res = await apiFetch<{ data: ApiKeyRow[] }>(
      `/organizations/${activeOrgId}/api-keys`,
      { orgId: activeOrgId },
    );
    setKeys(res.data);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    const res = await apiFetch<ApiKeyRow & { apiKey: string }>(
      `/organizations/${activeOrgId}/api-keys`,
      {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify({ name }),
      },
    );
    setCreated(res.apiKey);
    toast.success('API key created — copy it now');
    await load();
  }

  async function revoke(id: string) {
    if (!activeOrgId) return;
    await apiFetch(`/organizations/${activeOrgId}/api-keys/${id}`, {
      method: 'DELETE',
      orgId: activeOrgId,
    });
    toast.message('Key revoked');
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API management</h1>
        <p className="text-muted">
          Issue organization API keys (`ink_…`) for programmatic audits and report access.
        </p>
      </div>

      {created ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle>Copy this key</CardTitle>
            <CardDescription>It will not be shown again.</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-white p-3 text-sm">{created}</code>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(created);
                toast.success('Copied');
              }}
            >
              Copy
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={create}>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <Button type="submit">Create Key</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {keys.length === 0 ? (
            <p className="text-sm text-muted">No API keys.</p>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{k.name}</div>
                  <div className="text-xs text-muted">
                    {k.keyPrefix}… · {k.scopes.join(', ')} · created{' '}
                    {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => void revoke(k.id)}>
                  Revoke
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
