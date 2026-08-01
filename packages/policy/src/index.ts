import type { FindingSeverity } from '@inspectra/audit-contracts';

/** Placeholder severity policy — replace with compliance packs later. */
export function defaultSeverityWeight(severity: FindingSeverity): number {
  switch (severity) {
    case 'critical':
      return 100;
    case 'high':
      return 80;
    case 'medium':
      return 50;
    case 'low':
      return 20;
    case 'info':
    default:
      return 0;
  }
}
