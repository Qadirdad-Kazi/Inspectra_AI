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

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent':
        'InspectraStoreBot/1.0 (+https://inspectra.ai; store listing research)',
      Accept: 'text/html,application/json,*/*',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const text = await fetchText(url, init);
  return JSON.parse(text) as T;
}
