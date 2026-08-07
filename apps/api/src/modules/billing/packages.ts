/**
 * One-time audit credit packs — no subscription, credits never expire.
 */
export type AuditPackage = {
  id: string;
  name: string;
  audits: number;
  priceUsd: number;
  blurb: string;
  highlighted?: boolean;
  /** Optional Stripe Price ID override via env */
  stripePriceEnv?: string;
};

export const AUDIT_PACKAGES: AuditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    audits: 5,
    priceUsd: 3.99,
    blurb: 'Try Inspectra on a handful of sites or store listings.',
    stripePriceEnv: 'STRIPE_PRICE_PACK_STARTER',
  },
  {
    id: 'growth',
    name: 'Growth',
    audits: 25,
    priceUsd: 14.99,
    blurb: 'Best for freelancers and small product teams.',
    highlighted: true,
    stripePriceEnv: 'STRIPE_PRICE_PACK_GROWTH',
  },
  {
    id: 'pro',
    name: 'Pro',
    audits: 100,
    priceUsd: 39.99,
    blurb: 'High volume audits for agencies and in-house ops.',
    stripePriceEnv: 'STRIPE_PRICE_PACK_PRO',
  },
];

export function getAuditPackage(id: string): AuditPackage | undefined {
  return AUDIT_PACKAGES.find((p) => p.id === id);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
