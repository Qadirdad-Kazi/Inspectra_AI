/**
 * Inspectra Studio access plans — separate from audit credit packs.
 * Weekly / monthly recurring-style periods, plus custom day passes.
 */
export type StudioPlan = {
  id: string;
  name: string;
  /** Display interval label */
  interval: 'week' | 'month' | 'custom';
  /** Access length in days when granted */
  durationDays: number;
  priceUsd: number;
  /** Per-day rate used when customDays is selected */
  pricePerDayUsd?: number;
  blurb: string;
  highlighted?: boolean;
  stripePriceEnv?: string;
  minCustomDays?: number;
  maxCustomDays?: number;
};

export const STUDIO_PLANS: StudioPlan[] = [
  {
    id: 'studio-weekly',
    name: 'Studio Weekly',
    interval: 'week',
    durationDays: 7,
    priceUsd: 4.99,
    blurb: 'Full Screenshot Studio access for 7 days — launch-week creatives.',
    stripePriceEnv: 'STRIPE_PRICE_STUDIO_WEEKLY',
  },
  {
    id: 'studio-monthly',
    name: 'Studio Monthly',
    interval: 'month',
    durationDays: 30,
    priceUsd: 9.99,
    blurb: 'Best value for ongoing App Store / Play Store screenshot production.',
    highlighted: true,
    stripePriceEnv: 'STRIPE_PRICE_STUDIO_MONTHLY',
  },
  {
    id: 'studio-custom',
    name: 'Studio Custom',
    interval: 'custom',
    durationDays: 1,
    priceUsd: 2.99,
    pricePerDayUsd: 2.99,
    blurb: 'Pick 1–14 days — day pass for a one-off export sprint.',
    stripePriceEnv: 'STRIPE_PRICE_STUDIO_CUSTOM_DAY',
    minCustomDays: 1,
    maxCustomDays: 14,
  },
];

export function getStudioPlan(id: string): StudioPlan | undefined {
  return STUDIO_PLANS.find((p) => p.id === id);
}

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

export function studioAccessDurationDays(plan: StudioPlan, customDays?: number): number {
  if (plan.interval === 'custom') {
    return Math.max(
      plan.minCustomDays ?? 1,
      Math.min(plan.maxCustomDays ?? 14, customDays ?? 1),
    );
  }
  return plan.durationDays;
}
