import type { ModuleResult, ScoreBreakdown } from '../types/index.js';
import { clampScore } from '../providers/helpers.js';

export function computeStoreScores(modules: ModuleResult[]): ScoreBreakdown {
  const totalWeight = modules.reduce((s, m) => s + m.weight, 0) || 1;
  const rows = modules.map((m) => ({
    moduleId: m.moduleId,
    label: m.label,
    score: m.score,
    weight: m.weight,
    contribution: Number(((m.score * m.weight) / totalWeight).toFixed(2)),
  }));
  const overall = clampScore(
    rows.reduce((s, r) => s + r.score * r.weight, 0) / totalWeight,
  );
  return {
    overall,
    modules: rows,
    formula:
      'overall = Σ(score_i × weight_i) / Σ(weight_i); weights: ASO 0.20, metadata 0.18, reviews 0.18, screenshots 0.17, competitors 0.15, icon 0.12',
  };
}
