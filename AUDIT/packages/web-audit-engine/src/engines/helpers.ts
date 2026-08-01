import { createHash } from 'node:crypto';
import type { FindingDraft } from '../types/index.js';

export function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deduct(
  score: number,
  findings: FindingDraft[],
  finding: FindingDraft,
  amount: number,
): number {
  findings.push(finding);
  return clampScore(score - amount);
}
