import type {
  EffortBand,
  ProfessionalReport,
  ReportBuilderInput,
  ReportRecommendation,
} from './types.js';

const EFFORT_HOURS: Record<string, [number, number]> = {
  xs: [0.5, 2],
  s: [2, 8],
  m: [8, 24],
  l: [24, 80],
  xl: [80, 160],
};

function normalizeEffort(rec: ReportRecommendation): EffortBand | string {
  return (
    rec.effort ||
    rec.technicalImpact?.effort ||
    (rec.priority === 'critical' || rec.priority === 'high' ? 'l' : 'm')
  );
}

function hoursHint(effort: string): string {
  const range = EFFORT_HOURS[effort] ?? EFFORT_HOURS.m!;
  return `${range[0]}–${range[1]} eng hours (band ${effort})`;
}

/** Assemble a professional report document from audit + AI intelligence payloads. */
export function buildProfessionalReport(input: ReportBuilderInput): ProfessionalReport {
  const recommendations = (input.recommendations ?? []).map((r) => {
    const effortEstimate = normalizeEffort(r);
    return {
      ...r,
      effortEstimate,
      effortHoursHint: hoursHint(String(effortEstimate)),
    };
  });

  const byEffort: Record<string, number> = {};
  let minH = 0;
  let maxH = 0;
  for (const r of recommendations) {
    const key = String(r.effortEstimate);
    byEffort[key] = (byEffort[key] ?? 0) + 1;
    const range = EFFORT_HOURS[key] ?? EFFORT_HOURS.m!;
    minH += range[0];
    maxH += range[1];
  }

  const findings = input.findings ?? [];
  const bySeverity: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }

  const weak = [...input.categoryScores].sort((a, b) => a.score - b.score).slice(0, 3);
  const executiveSummary =
    input.executiveSummary ||
    [
      `Inspectra audited ${input.target.label} and scored ${input.overallScore}/100.`,
      weak.length
        ? `Lowest categories: ${weak.map((w) => `${w.label} (${w.score})`).join(', ')}.`
        : '',
      `${recommendations.length} prioritized recommendation(s); ${findings.length} finding(s).`,
    ]
      .filter(Boolean)
      .join(' ');

  return {
    schemaVersion: 'inspectra.report.v1',
    title: input.title || `Inspectra report — ${input.target.label}`,
    generatedAt: new Date().toISOString(),
    organizationName: input.organizationName,
    target: input.target,
    auditId: input.auditId,
    executiveSummary,
    overallScore: input.overallScore,
    formula: input.formula,
    categoryScores: input.categoryScores,
    recommendations,
    effortSummary: {
      totalItems: recommendations.length,
      byEffort,
      estimatedHoursRange:
        recommendations.length === 0 ? '0 hours' : `${minH}–${maxH} eng hours`,
    },
    findingsSummary: {
      total: findings.length,
      bySeverity,
      top: findings.slice(0, 25),
    },
    highlights: input.highlights ?? [],
    risks: input.risks ?? [],
    generatedBy: input.generatedBy ?? 'report-engine',
    extras: input.extras,
  };
}
