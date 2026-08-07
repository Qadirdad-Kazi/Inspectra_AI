'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { detectAuditTarget, stashPendingTarget } from '@/lib/detect-target';
import { useAuth } from '@/components/providers/auth-provider';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  /** Where to send anonymous users after stashing the target */
  guestHref?: string;
  size?: 'hero' | 'compact';
  defaultValue?: string;
  onStarted?: (auditId: string) => void;
};

export function QuickAuditBar({
  guestHref = '/sign-up',
  size = 'hero',
  defaultValue = '',
  onStarted,
}: Props) {
  const { user, activeOrgId } = useAuth();
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);

  const detected = useMemo(() => detectAuditTarget(value), [value]);

  async function startAuthenticated(target: NonNullable<typeof detected>) {
    if (!activeOrgId) {
      toast.error('Select or create an organization first');
      router.push('/dashboard');
      return;
    }
    setLoading(true);
    try {
      const body =
        target.kind === 'web'
          ? {
              type: 'web' as const,
              url: target.value,
              config: { maxPages: 12, maxDepth: 2, requestDelayMs: 300 },
            }
          : {
              type: target.kind,
              storeIdentifier: target.value,
              config: { country: 'us', maxReviews: 25 },
            };

      const audit = await apiFetch<{ id: string }>(`/organizations/${activeOrgId}/audits`, {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify(body),
      });
      toast.success(`${target.label} audit started`);
      onStarted?.(audit.id);
      router.push(`/audits/${audit.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start audit';
      toast.error(message);
      if (/credit|package|NO_AUDIT/i.test(message)) {
        router.push('/billing');
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const target = detectAuditTarget(value);
    if (!target) {
      toast.error('Paste a website URL or Play / App Store / Microsoft Store link');
      return;
    }

    if (!user) {
      stashPendingTarget(target);
      toast.message('Create a free workspace — includes 1 live audit');
      router.push(`${guestHref}?next=/audits&autostart=1`);
      return;
    }

    void startAuthenticated(target);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        size === 'hero'
          ? 'flex w-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-lg shadow-slate-900/5 backdrop-blur sm:flex-row sm:items-center'
          : 'flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:flex-row sm:items-center'
      }
    >
      <div className="min-w-0 flex-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a website or app store URL…"
          className={
            size === 'hero'
              ? 'h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0'
              : 'h-10 border-0 bg-transparent shadow-none focus-visible:ring-0'
          }
          aria-label="Target URL"
        />
        {detected ? (
          <p className="px-3 pb-1 text-xs text-slate-500">
            Detected · <span className="font-medium text-teal-800">{detected.label}</span>
          </p>
        ) : value.trim() ? (
          <p className="px-3 pb-1 text-xs text-amber-700">Unrecognized — use a full URL or store ID</p>
        ) : null}
      </div>
      <Button
        type="submit"
        size={size === 'hero' ? 'lg' : 'default'}
        disabled={loading}
        className="shrink-0 sm:min-w-[160px]"
      >
        {loading ? 'Starting…' : 'Run Audit'}
      </Button>
    </form>
  );
}
