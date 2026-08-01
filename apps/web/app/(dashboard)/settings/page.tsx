'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type Member = { id: string; email: string; name?: string | null; role: string };
type OrgDetails = {
  id: string;
  name: string;
  slug: string;
  region: string;
  settings?: {
    retentionDays: number;
    allowAiTriage: boolean;
    requireMfa: boolean;
    ssoEnforced: boolean;
  };
};

export default function SettingsPage() {
  const { activeOrgId, refreshUser } = useAuth();
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!activeOrgId) return;
    void (async () => {
      const details = await apiFetch<OrgDetails>(`/organizations/${activeOrgId}`, {
        orgId: activeOrgId,
      });
      setOrg(details);
      setName(details.name);
      const memberRes = await apiFetch<{ data: Member[] }>(
        `/organizations/${activeOrgId}/members`,
        { orgId: activeOrgId },
      );
      setMembers(memberRes.data);
    })().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

  async function saveOrg(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    try {
      const updated = await apiFetch<OrgDetails>(`/organizations/${activeOrgId}`, {
        method: 'PATCH',
        orgId: activeOrgId,
        body: JSON.stringify({ name }),
      });
      setOrg(updated);
      await refreshUser();
      toast.success('Organization updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    try {
      const invitation = await apiFetch<{ acceptToken?: string }>(
        `/organizations/${activeOrgId}/invitations`,
        {
          method: 'POST',
          orgId: activeOrgId,
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );
      toast.success(
        invitation.acceptToken
          ? `Invited. Dev token: ${invitation.acceptToken}`
          : 'Invitation sent',
      );
      setInviteEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed');
    }
  }

  if (!activeOrgId) return <p className="text-muted">Select an organization.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted">Organization profile, members, and security preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Slug: {org?.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={saveOrg}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Roles: owner, admin, analyst, viewer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  {m.name || m.email}
                  <span className="ml-2 text-muted">{m.email}</span>
                </span>
                <span className="capitalize text-muted">{m.role}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <form className="grid gap-3 md:grid-cols-[1fr_140px_auto]" onSubmit={invite}>
            <Input
              type="email"
              placeholder="teammate@company.com"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="h-10 rounded-md border border-border bg-white px-2 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <Button type="submit">Invite</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
