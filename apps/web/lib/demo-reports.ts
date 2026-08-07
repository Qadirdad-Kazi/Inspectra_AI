/** Client-side demo reports — local samples users can browse without running an audit. */

export type DemoFinding = {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  remediation?: string;
  impactPoints?: number;
};

export type DemoSurface = {
  id: string;
  label: string;
  status: 'strong' | 'needs_work' | 'weak';
  note: string;
};

export type DemoReport = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'web' | 'store';
  targetLabel: string;
  score: number; // 0–100
  summary: string;
  surfaces: DemoSurface[];
  findings: DemoFinding[];
  strengths: Array<{ title: string; detail: string }>;
  listing?: {
    developer?: string;
    category?: string;
    rating?: string;
    downloads?: string;
    iconUrl?: string;
    screenshotUrls?: string[];
    shortDescription?: string;
    description?: string;
  };
};

export const BUILTIN_DEMOS: DemoReport[] = [];
// Real sample reports will be added here when ready — do not ship fake placeholders.

const CUSTOM_KEY = 'inspectra_custom_demos';

export function listCustomDemos(): DemoReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoReport[];
  } catch {
    return [];
  }
}

export function saveCustomDemo(demo: DemoReport) {
  const all = listCustomDemos().filter((d) => d.id !== demo.id);
  all.unshift(demo);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(all.slice(0, 20)));
}

export function deleteCustomDemo(id: string) {
  const all = listCustomDemos().filter((d) => d.id !== id);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
}

export function getDemoById(id: string): DemoReport | null {
  return BUILTIN_DEMOS.find((d) => d.id === id) ?? listCustomDemos().find((d) => d.id === id) ?? null;
}

export function scoreBand(score: number): { label: string; tone: 'strong' | 'fair' | 'weak' } {
  if (score >= 80) return { label: 'Strong', tone: 'strong' };
  if (score >= 60) return { label: 'Solid', tone: 'fair' };
  return { label: 'Needs work', tone: 'weak' };
}

export function toTenScale(score100: number): string {
  return (Math.round((score100 / 10) * 10) / 10).toFixed(1);
}
