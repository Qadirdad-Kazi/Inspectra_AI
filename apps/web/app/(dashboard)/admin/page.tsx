'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Stats = {
  users: number;
  organizations: number;
  activeSubscriptions: number;
  notifications: number;
};

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  isPlatformAdmin: boolean;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    if (!user?.isPlatformAdmin) return;
    void (async () => {
      const [s, u] = await Promise.all([
        apiFetch<Stats>('/admin/stats'),
        apiFetch<{ data: AdminUser[] }>('/admin/users'),
      ]);
      setStats(s);
      setUsers(u.data);
    })().catch((err) => toast.error(err.message));
  }, [user?.isPlatformAdmin]);

  if (!user?.isPlatformAdmin) {
    return <p className="text-muted">Platform admin access required.</p>;
  }

  async function toggleActive(u: AdminUser) {
    try {
      const updated = await apiFetch<AdminUser>(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, ...updated } : row)));
      toast.success('User updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted">Platform operators only — users, orgs, and SaaS health.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Users', stats?.users],
          ['Organizations', stats?.organizations],
          ['Active Subs', stats?.activeSubscriptions],
          ['Notifications', stats?.notifications],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value ?? '—'}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-muted">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {u.isPlatformAdmin ? <Badge>Admin</Badge> : null}
                <Badge>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                <Button size="sm" variant="outline" onClick={() => void toggleActive(u)}>
                  {u.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
