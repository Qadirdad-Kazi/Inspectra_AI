/**
 * One-time audit credit packs — no subscription, credits never expire.
 * Keep in sync with apps/api/src/modules/billing/packages.ts
 */
export type AuditPackage = {
  id: string;
  name: string;
  audits: number;
  priceUsd: number;
  blurb: string;
  highlighted?: boolean;
};

export const AUDIT_PACKAGES: AuditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    audits: 5,
    priceUsd: 3.99,
    blurb: 'Try Inspectra on a handful of sites or store listings.',
  },
  {
    id: 'growth',
    name: 'Growth',
    audits: 25,
    priceUsd: 14.99,
    blurb: 'Best for freelancers and small product teams.',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    audits: 100,
    priceUsd: 39.99,
    blurb: 'High volume audits for agencies and in-house ops.',
  },
];

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
