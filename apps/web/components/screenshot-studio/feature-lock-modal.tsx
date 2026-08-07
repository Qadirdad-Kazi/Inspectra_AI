'use client';

import { Lock, Sparkles, ShieldCheck, CheckCircle2, CalendarDays, CalendarRange, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STUDIO_PLANS, studioPlanPriceUsd, type StudioPlan } from '@/lib/studio-plans';
import { formatUsd } from '@/lib/packages';
import { useState } from 'react';

interface FeatureLockModalProps {
  reason?: string;
  buyingPlanId?: string | null;
  onPurchase: (planId: string, customDays?: number) => void;
}

const ICONS: Record<StudioPlan['interval'], typeof CalendarDays> = {
  week: CalendarDays,
  month: CalendarRange,
  custom: Timer,
};

export function FeatureLockModal({ reason, buyingPlanId, onPurchase }: FeatureLockModalProps) {
  const [customDays, setCustomDays] = useState(3);

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center shadow-2xl">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
        <Lock className="h-8 w-8" />
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
        Inspectra Studio <Sparkles className="h-5 w-5 text-amber-400" />
      </h2>
      <p className="mt-2 max-w-lg text-sm text-slate-300">
        {reason ||
          'Studio is a separate product from audits. Choose weekly, monthly, or a custom day pass.'}
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
        <ShieldCheck className="h-4 w-4 text-indigo-400" />
        Platform admins always have unrestricted access
      </div>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
        {STUDIO_PLANS.map((plan) => {
          const Icon = ICONS[plan.interval];
          const price =
            plan.interval === 'custom'
              ? studioPlanPriceUsd(plan, customDays)
              : plan.priceUsd;
          const buying = buyingPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-4 text-left ${
                plan.highlighted
                  ? 'border-cyan-400/40 bg-cyan-500/10'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-cyan-300">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{plan.name}</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatUsd(price)}</div>
              <p className="mt-1 min-h-[40px] text-xs text-slate-400">{plan.blurb}</p>
              {plan.interval === 'custom' ? (
                <label className="mt-3 flex flex-col gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                  Days
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                    className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-white"
                  />
                </label>
              ) : null}
              <Button
                disabled={Boolean(buyingPlanId)}
                onClick={() =>
                  onPurchase(plan.id, plan.interval === 'custom' ? customDays : undefined)
                }
                className={`mt-4 w-full ${
                  plan.highlighted
                    ? 'bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {buying ? 'Opening checkout…' : `Get ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid w-full max-w-xl gap-2 text-left text-xs text-slate-300">
        {[
          'Multi-artboard canvas with drag, align, and keyboard nudge',
          'Device mockups · AI layout generator · PNG export',
          'Separate from audit credits — buy only what you need',
        ].map((line) => (
          <div key={line} className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
