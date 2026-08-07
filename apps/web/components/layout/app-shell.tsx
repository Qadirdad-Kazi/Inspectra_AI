'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Cable,
  CreditCard,
  FileSearch,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/audits', label: 'Audits', icon: FileSearch },
  { href: '/tools/screenshot-studio', label: 'Inspectra Studio', icon: Sparkles },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/automation', label: 'Automation', icon: Timer },
  { href: '/integrations', label: 'Integrations', icon: Cable },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/notifications', label: 'Inbox', icon: Bell },
  { href: '/billing', label: 'Packages', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, activeOrgId, setOrg, signOut } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">Loading workspace…</div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/sign-in');
    return null;
  }

  const activeOrg = user.organizations.find((o) => o.id === activeOrgId) ?? user.organizations[0];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Inspectra<span className="text-teal-400">.</span>
          </Link>
          <p className="mt-1 text-xs text-sidebar-muted">Paste a link. Get a clear audit.</p>
        </div>

        <div className="px-3 py-4">
          <label className="mb-1 block px-2 text-[11px] uppercase tracking-wide text-sidebar-muted">
            Organization
          </label>
          <select
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-sm"
            value={activeOrg?.id ?? ''}
            onChange={(e) => setOrg(e.target.value)}
          >
            {user.organizations.map((org) => (
              <option key={org.id} value={org.id} className="text-slate-900">
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-white/5 hover:text-white',
                  active && 'bg-white/10 text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
          {user.isPlatformAdmin ? (
            <Link
              href="/admin"
              className={cn(
                'mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-white/5 hover:text-white',
                pathname.startsWith('/admin') && 'bg-white/10 text-white',
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 truncate text-sm">
            <div className="font-medium text-white">{user.name || 'User'}</div>
            <div className="truncate text-xs text-sidebar-muted">{user.email}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => void signOut().then(() => router.push('/sign-in'))}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-sm text-muted">
            {activeOrg ? (
              <>
                <span className="font-medium text-foreground">{activeOrg.name}</span>
                <span className="mx-2">·</span>
                <span className="capitalize">{activeOrg.role}</span>
              </>
            ) : (
              'No organization'
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/audits" className="text-sm font-medium text-teal-800 hover:underline">
              New audit
            </Link>
            <Link href="/notifications" className="text-sm text-muted hover:text-foreground">
              Inbox
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
