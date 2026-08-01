import type {
  FindingDraft,
  ModuleResult,
  ScoreBreakdown,
  StoreAuditReport,
  StoreListing,
} from '../types/index.js';

/**
 * Report generation without AI fix suggestions (observational only).
 */
export function buildStoreReport(input: {
  listing: StoreListing;
  scores: ScoreBreakdown;
  modules: ModuleResult[];
  findings: FindingDraft[];
}): StoreAuditReport {
  const weak = [...input.scores.modules].sort((a, b) => a.score - b.score).slice(0, 2);
  const highlights = input.modules
    .filter((m) => m.score >= 80)
    .map((m) => `${m.label} scored ${m.score}/100`);
  const risks = input.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 6)
    .map((f) => f.title);

  const observations = input.findings.slice(0, 10).map((f) => ({
    area: f.category,
    note: f.title,
  }));

  const executiveSummary = [
    `Inspectra audited the ${input.listing.platform.replace('_', ' ')} listing for “${input.listing.title}” (${input.listing.storeId}).`,
    `Overall store score ${input.scores.overall}/100.`,
    weak.length
      ? `Lowest modules: ${weak.map((w) => `${w.label} (${w.score})`).join(', ')}.`
      : '',
    `${input.findings.length} observational finding(s) recorded. Fix suggestions are intentionally deferred.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: `Store audit — ${input.listing.title}`,
    executiveSummary,
    highlights: highlights.length ? highlights : ['No high-scoring modules yet'],
    risks: risks.length ? risks : ['No critical/high risks detected in automation'],
    observations,
    generatedBy: 'template',
  };
}
