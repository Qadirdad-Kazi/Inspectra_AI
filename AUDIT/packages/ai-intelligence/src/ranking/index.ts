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
  for (const r of recommendations) {
    const key = r.title.toLowerCase().trim();
    const existing = byTitle.get(key);
    if (!existing || recommendationScore(r) > recommendationScore(existing)) {
      byTitle.set(key, r);
    }
  }
  return [...byTitle.values()].sort(
    (a, b) => recommendationScore(b) - recommendationScore(a),
  );
}
