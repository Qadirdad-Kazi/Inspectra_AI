import type { ImpactLevel, Recommendation } from '../types/index.js';

const PRIORITY_WEIGHT: Record<ImpactLevel, number> = {
  critical: 100,
  high: 80,
  medium: 55,
  low: 30,
  info: 10,
};

const EFFORT_COST: Record<Recommendation['technicalImpact']['effort'], number> = {
  xs: 1,
  s: 2,
  m: 4,
  l: 7,
  xl: 10,
};

/** Higher = address sooner (impact vs effort, confidence-adjusted). */
export function recommendationScore(r: Recommendation): number {
  const impact =
    PRIORITY_WEIGHT[r.priority] * 0.55 +
    PRIORITY_WEIGHT[r.businessImpact.level] * 0.3 +
    PRIORITY_WEIGHT[r.technicalImpact.level] * 0.15;
  const effortPenalty = EFFORT_COST[r.technicalImpact.effort] * 2.5;
  return impact - effortPenalty + r.confidence * 10;
}

export function prioritizeRecommendations(
  recommendations: Recommendation[],
): Recommendation[] {
  const byTitle = new Map<string, Recommendation>();
  let screenshotSlot: Recommendation | null = null;

  for (const r of recommendations) {
    const key = r.title.toLowerCase().trim();
    const isScreenshotNoise =
      /^(no |few )?screenshots?\b/i.test(key) ||
      /\bscreenshots? (to review|found|for conversion|detected|missing)\b/i.test(key);

    if (isScreenshotNoise) {
      if (!screenshotSlot || recommendationScore(r) > recommendationScore(screenshotSlot)) {
        screenshotSlot = {
          ...r,
          title: 'Store screenshots could not be loaded',
          summary:
            'Listing scrape returned zero screenshot URLs. This is a collection gap — not a creative critique of your real store frames.',
          actions: [
            'Re-run with an official Play / App Store / Microsoft Store product URL',
            ...(r.actions ?? [])
              .filter((a) => !/^Investigate and remediate:/i.test(a))
              .slice(0, 1),
          ],
        };
      }
      continue;
    }

    const existing = byTitle.get(key);
    if (!existing || recommendationScore(r) > recommendationScore(existing)) {
      byTitle.set(key, r);
    }
  }

  const merged = [...byTitle.values()];
  if (screenshotSlot) merged.push(screenshotSlot);

  return merged.sort((a, b) => recommendationScore(b) - recommendationScore(a));
}
