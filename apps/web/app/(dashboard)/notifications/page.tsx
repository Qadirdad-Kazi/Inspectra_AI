'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  readAt?: string | null;
};

export default function NotificationsPage() {
  const { activeOrgId } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  async function load() {
    if (!activeOrgId) return;
    const res = await apiFetch<{ data: NotificationItem[] }>(
      `/organizations/${activeOrgId}/notifications`,
      { orgId: activeOrgId },
    );
    setItems(res.data);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  async function markAllRead() {
    if (!activeOrgId) return;
    await apiFetch(`/organizations/${activeOrgId}/notifications/read`, {
      method: 'POST',
      orgId: activeOrgId,
      body: JSON.stringify({}),
    });
    toast.success('Marked as read');
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted">In-app alerts for invites, billing, and system events.</p>
        </div>
        <Button variant="outline" onClick={() => void markAllRead()}>
          Mark all read
        </Button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted">No notifications yet.</CardContent>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className={n.readAt ? 'opacity-70' : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{n.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                <p>{n.body}</p>
                <p className="mt-2 text-xs">{new Date(n.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
