import type { EngineResult, FindingDraft, ScoreBreakdown, WebsiteAuditOutput } from '../types/index.js';

function severityRank(s: FindingDraft['severity']): number {
  switch (s) {
    case 'critical':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    default:
      return 1;
  }
}

export function buildAiReport(input: {
  url: string;
  scores: ScoreBreakdown;
  engines: EngineResult[];
  findings: FindingDraft[];
}): WebsiteAuditOutput['aiReport'] {
  const top = [...input.findings]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 8);

  const weak = [...input.scores.engines].sort((a, b) => a.score - b.score).slice(0, 2);

  const recommendations = top.map((f) => ({
    priority: f.severity,
    title: f.title,
    detail: f.remediation || f.description,
  }));

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      title: 'Maintain current posture',
      detail: 'No major automated findings. Re-run after significant releases.',
    });
  }

  const executiveSummary = [
    `Inspectra audited ${input.url} and scored ${input.scores.overall}/100 overall.`,
    weak.length
      ? `Lowest categories: ${weak.map((w) => `${w.label} (${w.score})`).join(', ')}.`
      : '',
    `Automated engines produced ${input.findings.length} finding(s).`,
    `Scoring uses transparent weights — ${input.scores.formula}`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: `Website audit report — ${input.url}`,
    executiveSummary,
    recommendations,
    generatedBy: 'template',
  };
}

/** Optional LLM enrichment when OpenAI / OpenRouter / Gemini is configured. */
export async function maybeEnrichWithLlm(
  report: WebsiteAuditOutput['aiReport'],
  context: { url: string; scores: ScoreBreakdown; findings: FindingDraft[] },
): Promise<WebsiteAuditOutput['aiReport']> {
  try {
    const { chatCompletions, isLlmAvailable, safeParseJson } = await import('@inspectra/llm');
    if (!isLlmAvailable()) return report;

    const prompt = {
      url: context.url,
      overall: context.scores.overall,
      findings: context.findings.slice(0, 15).map((f) => ({
        severity: f.severity,
        title: f.title,
        remediation: f.remediation,
      })),
    };

    const result = await chatCompletions({
      temperature: 0.2,
      json: true,
      timeoutMs: 30000,
      messages: [
        {
          role: 'system',
          content:
            'You are Inspectra AI. Return JSON with keys executiveSummary (string) and recommendations (array of {priority,title,detail}). Be concise and actionable.',
        },
        { role: 'user', content: JSON.stringify(prompt) },
      ],
    });
    if (!result?.text) return report;

    const parsed = safeParseJson<{
      executiveSummary?: string;
      recommendations?: Array<{ priority: string; title: string; detail: string }>;
    }>(result.text);
    if (!parsed) return report;

    return {
      title: report.title,
      executiveSummary: parsed.executiveSummary || report.executiveSummary,
      recommendations: parsed.recommendations?.length
        ? parsed.recommendations
        : report.recommendations,
      generatedBy: 'llm',
    };
  } catch {
    return report;
  }
}
