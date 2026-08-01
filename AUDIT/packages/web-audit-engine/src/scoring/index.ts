import type { EngineResult, ScoreBreakdown } from '../types/index.js';
import { clampScore } from '../engines/helpers.js';

/**
 * Transparent weighted scoring:
 * overall = sum(engine.score * engine.weight) / sum(weights)
 */
export function computeScores(engines: EngineResult[]): ScoreBreakdown {
  const totalWeight = engines.reduce((sum, e) => sum + e.weight, 0) || 1;
  const rows = engines.map((e) => ({
    engineId: e.engineId,
    label: e.label,
    score: e.score,
    weight: e.weight,
    contribution: Number(((e.score * e.weight) / totalWeight).toFixed(2)),
  }));
  const overall = clampScore(
    rows.reduce((sum, r) => sum + r.score * r.weight, 0) / totalWeight,
  );

  return {
    overall,
    engines: rows,
    formula:
      'overall = Σ(score_i × weight_i) / Σ(weight_i); weights: security 0.25, seo/perf/a11y 0.20, best_practices 0.15',
  };
}
