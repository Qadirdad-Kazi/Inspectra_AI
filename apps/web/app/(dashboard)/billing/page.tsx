'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AUDIT_PACKAGES, formatUsd } from '@/lib/packages';
import { STUDIO_PLANS, studioPlanPriceUsd } from '@/lib/studio-plans';

type Entitlements = {
  plan: string;
  seatsIncluded: number;
  auditMinutesIncluded: number;
  aiTriageEnabled: boolean;
  maxConcurrentAudits: number;
  auditCredits: number;
  unlimitedAudits: boolean;
};

type StudioEntitlement = {
  hasAccess: boolean;
  reason?: string;
  plan?: string | null;
  expiresAt?: string | null;
};

export default function BillingPage() {
  const { activeOrgId, user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [studio, setStudio] = useState<StudioEntitlement | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState(3);

  async function refresh() {
    if (!activeOrgId) return;
    const [e, s] = await Promise.all([
      apiFetch<Entitlements>(`/organizations/${activeOrgId}/billing/entitlements`, {
        orgId: activeOrgId,
      }),
      user?.isPlatformAdmin
        ? Promise.resolve({
            hasAccess: true,
            reason: 'Platform Admin — unrestricted',
            plan: 'admin',
            expiresAt: null,
          } satisfies StudioEntitlement)
        : apiFetch<StudioEntitlement>(
            `/organizations/${activeOrgId}/screenshot-studio/entitlement`,
            { orgId: activeOrgId },
          ).catch(() => ({ hasAccess: false } as StudioEntitlement)),
    ]);
    setEntitlements(e);
    setStudio(s);
  }

  useEffect(() => {
    if (!activeOrgId) return;
    void refresh().catch((err) => toast.error(err.message));
  }, [activeOrgId, user?.isPlatformAdmin]);

  async function buyPack(packageId: string) {
    if (!activeOrgId) return;
    setBuying(packageId);
    try {
      const result = await apiFetch<{
        mode: string;
        url: string | null;
        auditCredits: number;
        auditsGranted: number;
        message: string | null;
      }>(`/organizations/${activeOrgId}/billing/packages/checkout`, {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify({
          packageId,
          successUrl: `${window.location.origin}/billing?purchased=1`,
          cancelUrl: `${window.location.origin}/billing?canceled=1`,
        }),
      });

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      toast.success(
        result.message ??
          `Added ${result.auditsGranted} audit credits. Balance: ${result.auditCredits}.`,
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBuying(null);
    }
  }

  async function buyStudio(planId: string, days?: number) {
    if (!activeOrgId) return;
    setBuying(planId);
    try {
      const result = await apiFetch<{
        url: string | null;
        message: string | null;
        expiresAt?: string;
      }>(`/organizations/${activeOrgId}/billing/studio/checkout`, {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify({
          planId,
          customDays: days,
          successUrl: `${window.location.origin}/billing?studio=1`,
          cancelUrl: `${window.location.origin}/billing?canceled=1`,
        }),
      });

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      toast.success(result.message ?? 'Screenshot Studio unlocked');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Studio checkout failed');
    } finally {
      setBuying(null);
    }
  }

  const unlimited = Boolean(entitlements?.unlimitedAudits);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Packages</h1>
        <p className="text-muted">
          Two separate products: Audit credits and Screenshot Studio access. Buying one never
          unlocks the other.
        </p>
      </div>

      {/* ─── Audit packages ─── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Audit Packages</h2>
          <p className="text-sm text-muted">
            One-time audit packs. Credits never expire. No subscription.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Balance</CardTitle>
            <CardDescription>
              {unlimited
                ? 'Unlimited account — audits are not deducted from a credit balance.'
                : 'Credits are deducted one per audit run. You need credits to start audits.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unlimited ? (
              <p className="text-3xl font-semibold">Unlimited</p>
            ) : (
              <p className="text-3xl font-semibold tabular-nums">
                {entitlements?.auditCredits ?? '…'}
                <span className="ml-2 text-base font-normal text-muted">audits left</span>
              </p>
            )}
            {!unlimited && entitlements && entitlements.auditCredits < 1 ? (
              <p className="mt-3 text-sm text-amber-800">
                Free starter credit used.{' '}
                <span className="font-medium">Buy an audit pack below</span>, or open{' '}
                <a href="/tools/screenshot-studio" className="font-medium underline">
                  Inspectra Studio
                </a>{' '}
                for store creatives (sold separately).
              </p>
            ) : null}
          </CardContent>
        </Card>

        {!unlimited ? (
          <div className="grid gap-4 md:grid-cols-3">
            {AUDIT_PACKAGES.map((pack) => (
              <Card
                key={pack.id}
                className={pack.highlighted ? 'border-teal-700/50 shadow-md' : undefined}
              >
                <CardHeader>
                  {pack.highlighted ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
                      Most Popular
                    </p>
                  ) : null}
                  <CardTitle>{pack.name}</CardTitle>
                  <CardDescription>{pack.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-semibold tabular-nums">
                      {formatUsd(pack.priceUsd)}
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {pack.audits} audits · never expires
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant={pack.highlighted ? 'default' : 'outline'}
                    disabled={buying !== null}
                    onClick={() => void buyPack(pack.id)}
                  >
                    {buying === pack.id ? 'Processing…' : 'Buy Once'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted">
              Audit package purchases are not required for your account.{' '}
              <Link href="/audits" className="font-medium text-teal-800 underline">
                Start an Audit
              </Link>
              .
            </CardContent>
          </Card>
        )}
      </section>

      {/* ─── Screenshot Studio packages (separate product) ─── */}
      <section id="studio-packages" className="scroll-mt-8 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-cyan-700" />
            Screenshot Studio Packages
          </h2>
          <p className="text-sm text-muted">
            Separate from audits. Unlocks Inspectra Studio — store mockups, AI creatives, and
            exports for App Store, Play Store, MS Store, and web.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Studio Access</CardTitle>
            <CardDescription>
              {studio?.hasAccess
                ? studio.reason ||
                  (studio.expiresAt
                    ? `Active until ${new Date(studio.expiresAt).toLocaleString()}`
                    : 'Studio is unlocked for this organization.')
                : 'Studio is locked until you choose a package below (org admins and platform admins are free).'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                studio?.hasAccess
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {studio?.hasAccess ? 'Unlocked' : 'Locked'}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/tools/screenshot-studio">Open Inspectra Studio</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {STUDIO_PLANS.map((plan) => {
            const price =
              plan.interval === 'custom'
                ? studioPlanPriceUsd(plan, customDays)
                : plan.priceUsd;
            return (
              <Card
                key={plan.id}
                className={plan.highlighted ? 'border-cyan-700/40 shadow-md' : undefined}
              >
                <CardHeader>
                  {plan.highlighted ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-cyan-800">
                      Most Popular
                    </p>
                  ) : null}
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-semibold tabular-nums">{formatUsd(price)}</div>
                    <div className="mt-1 text-sm text-muted">
                      {plan.interval === 'custom'
                        ? `${customDays} day${customDays === 1 ? '' : 's'} · $${plan.pricePerDayUsd}/day`
                        : `${plan.durationDays} days of Studio access`}
                    </div>
                  </div>
                  {plan.interval === 'custom' ? (
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                      Days (1–14)
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={customDays}
                        onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                        className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                  ) : null}
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    disabled={buying !== null}
                    onClick={() =>
                      void buyStudio(
                        plan.id,
                        plan.interval === 'custom' ? customDays : undefined,
                      )
                    }
                  >
                    {buying === plan.id ? 'Processing…' : `Get ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
