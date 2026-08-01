'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AUDIT_PACKAGES, formatUsd } from '@/lib/packages';

type Entitlements = {
  plan: string;
  seatsIncluded: number;
  auditMinutesIncluded: number;
  aiTriageEnabled: boolean;
  maxConcurrentAudits: number;
  auditCredits: number;
  unlimitedAudits: boolean;
};

export default function BillingPage() {
  const { activeOrgId } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  async function refresh() {
    if (!activeOrgId) return;
    const e = await apiFetch<Entitlements>(
      `/organizations/${activeOrgId}/billing/entitlements`,
      { orgId: activeOrgId },
    );
    setEntitlements(e);
  }

  useEffect(() => {
    if (!activeOrgId) return;
    void refresh().catch((err) => toast.error(err.message));
  }, [activeOrgId]);

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

  const unlimited = Boolean(entitlements?.unlimitedAudits);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Packages</h1>
        <p className="text-muted">
          One-time audit packs. Credits never expire. No subscription.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your balance</CardTitle>
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
              No credits left.{' '}
              <span className="font-medium">Buy a pack below</span> to run audits.
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
                    Most popular
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
                  {buying === pack.id ? 'Processing…' : 'Buy once'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted">
            Package purchases are not required for your account.{' '}
            <Link href="/audits" className="font-medium text-teal-800 underline">
              Start an audit
            </Link>
            .
          </CardContent>
        </Card>
      )}
    </div>
  );
}
