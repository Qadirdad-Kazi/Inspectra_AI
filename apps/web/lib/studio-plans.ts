/**
 * Inspectra Studio (screenshot / store creative) access plans.
 * Separate product from audit credit packs — keep in sync with
 * apps/api/src/modules/billing/studio-plans.ts
 */
export type StudioPlan = {
  id: string;
  name: string;
  interval: 'week' | 'month' | 'custom';
  durationDays: number;
  priceUsd: number;
  pricePerDayUsd?: number;
  blurb: string;
  highlighted?: boolean;
  minCustomDays?: number;
  maxCustomDays?: number;
};

/** Three Screenshot Studio packages — not audit credits */
export const STUDIO_PLANS: StudioPlan[] = [
  {
    id: 'studio-weekly',
    name: 'Studio Weekly',
    interval: 'week',
    durationDays: 7,
    priceUsd: 4.99,
    blurb: 'Full Screenshot Studio access for 7 days — launch-week creatives.',
  },
  {
    id: 'studio-monthly',
    name: 'Studio Monthly',
    interval: 'month',
    durationDays: 30,
    priceUsd: 9.99,
    blurb: 'Best value for ongoing App Store / Play Store screenshot production.',
    highlighted: true,
  },
  {
    id: 'studio-custom',
    name: 'Studio Custom',
    interval: 'custom',
    durationDays: 1,
    priceUsd: 2.99,
    pricePerDayUsd: 2.99,
    blurb: 'Pick 1–14 days — day pass for a one-off export sprint.',
    minCustomDays: 1,
    maxCustomDays: 14,
  },
];

export function studioPlanPriceUsd(plan: StudioPlan, customDays?: number): number {
  if (plan.interval === 'custom') {
    const days = Math.max(
      plan.minCustomDays ?? 1,
      Math.min(plan.maxCustomDays ?? 14, customDays ?? 1),
    );
    return Number(((plan.pricePerDayUsd ?? plan.priceUsd) * days).toFixed(2));
  }
  return plan.priceUsd;
}
