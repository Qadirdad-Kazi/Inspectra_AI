/**
 * Keep in sync with apps/api/src/modules/billing/studio-plans.ts
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

export const STUDIO_PLANS: StudioPlan[] = [
  {
    id: 'studio-weekly',
    name: 'Weekly',
    interval: 'week',
    durationDays: 7,
    priceUsd: 4.99,
    blurb: 'Full Studio access for 7 days — ideal for a launch week.',
  },
  {
    id: 'studio-monthly',
    name: 'Monthly',
    interval: 'month',
    durationDays: 30,
    priceUsd: 9.99,
    blurb: 'Best value for ongoing store creative production.',
    highlighted: true,
  },
  {
    id: 'studio-custom',
    name: 'Custom',
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
