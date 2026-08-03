import { createHash } from 'node:crypto';
import type {
  AgentId,
  AgentResult,
  FindingRef,
  ImpactLevel,
  IntelligenceInput,
  Priority,
  Recommendation,
} from '../types/index.js';
import { getActivePrompt } from '../prompts/registry.js';
import { modelForAgent, type resolveModelSelection } from '../models/index.js';
import { chatJson, safeParseJson } from '../llm/client.js';

export type AgentContext = {
  input: IntelligenceInput;
  memoryDigest: string;
  selection: ReturnType<typeof resolveModelSelection>;
  enableLlm: boolean;
};

export function findingsForCategories(
  findings: FindingRef[],
  categories: string[],
): FindingRef[] {
  const set = new Set(categories.map((c) => c.toLowerCase()));
  return findings.filter(
    (f) =>
      set.has(f.category.toLowerCase()) ||
      categories.some((c) => f.category.toLowerCase().includes(c.toLowerCase())),
  );
}

export function scoreFor(input: IntelligenceInput, ids: string[]): number | null {
  const hit = input.scores.breakdown.find((b) =>
    ids.some((id) => b.id === id || b.label.toLowerCase().includes(id.toLowerCase())),
  );
  return hit?.score ?? null;
}

export function recId(agentId: AgentId, title: string): string {
  return createHash('sha1').update(`${agentId}:${title}`).digest('hex').slice(0, 12);
}

export function makeRec(input: {
  agentId: AgentId;
  priority: Priority;
  title: string;
  summary: string;
  business: { level: ImpactLevel; explanation: string; estimatedBenefit: string };
  technical: {
    level: ImpactLevel;
    explanation: string;
    effort: Recommendation['technicalImpact']['effort'];
  };
  actions: string[];
  relatedFindings?: string[];
  confidence?: number;
  model: string;
  promptVersion: string;
  tags?: string[];
}): Recommendation {
  return {
    id: recId(input.agentId, input.title),
    agentId: input.agentId,
    priority: input.priority,
    title: input.title,
    summary: input.summary,
    businessImpact: input.business,
    technicalImpact: input.technical,
    actions: input.actions,
    relatedFindings: input.relatedFindings ?? [],
    confidence: input.confidence ?? 0.72,
    promptVersion: input.promptVersion,
    model: input.model,
    tags: input.tags,
  };
}

export function fromFindings(input: {
  agentId: AgentId;
  findings: FindingRef[];
  model: string;
  promptVersion: string;
  businessBenefit: string;
  mapTechnical: (f: FindingRef) => Recommendation['technicalImpact'];
  limit?: number;
}): Recommendation[] {
  return input.findings.slice(0, input.limit ?? 5).map((f) =>
    makeRec({
      agentId: input.agentId,
      priority: f.severity,
      title: f.title,
      summary: f.description,
      business: {
        level: f.severity,
        explanation: `Issue in ${f.category} can affect user trust and outcomes.`,
        estimatedBenefit: input.businessBenefit,
      },
      technical: input.mapTechnical(f),
      actions: f.remediation
        ? [f.remediation]
        : [
            f.category === 'competitors'
              ? 'Add competitor store IDs in the audit config when you want peer comparison.'
              : f.category === 'reviews'
                ? 'Aggregate rating still applies; detailed review themes need a public review feed.'
                : `Check the ${f.category.replace(/_/g, ' ')} section for evidence, then decide if this is a listing issue or incomplete scrape data.`,
          ],
      relatedFindings: [f.fingerprint],
      confidence: 0.8,
      model: input.model,
      promptVersion: input.promptVersion,
      tags: [f.category],
    }),
  );
}

type LlmRec = {
  title?: string;
  summary?: string;
  priority?: Priority;
  businessImpact?: { level?: ImpactLevel; explanation?: string; estimatedBenefit?: string };
  technicalImpact?: {
    level?: ImpactLevel;
    explanation?: string;
    effort?: Recommendation['technicalImpact']['effort'];
  };
  actions?: string[];
  confidence?: number;
};

/** Optional LLM enrichment — merges with heuristic recommendations. */
export async function maybeEnrichAgent(input: {
  ctx: AgentContext;
  agentId: AgentId;
  heuristic: AgentResult;
  userPayload: Record<string, unknown>;
}): Promise<AgentResult> {
  if (!input.ctx.enableLlm || !input.ctx.selection.llmAvailable) {
    return input.heuristic;
  }

  const prompt = getActivePrompt(input.agentId);
  const model = modelForAgent(input.agentId, input.ctx.selection);

  try {
    const llm = await chatJson({
      model,
      system: prompt.system,
      temperature: input.ctx.selection.temperature,
      maxTokens: input.ctx.selection.maxTokens,
      user: JSON.stringify({
        target: input.ctx.input.target,
        scores: input.ctx.input.scores,
        memory: input.ctx.memoryDigest,
        payload: input.userPayload,
        heuristicSummary: input.heuristic.summary,
      }),
    });
    if (!llm) return input.heuristic;

    const parsed = safeParseJson<{
      summary?: string;
      recommendations?: LlmRec[];
    }>(llm.text);
    if (!parsed?.recommendations?.length) {
      return {
        ...input.heuristic,
        summary: parsed?.summary ?? input.heuristic.summary,
        generatedBy: 'hybrid',
        model: llm.model,
      };
    }

    const llmRecs = parsed.recommendations.slice(0, 6).map((r) =>
      makeRec({
        agentId: input.agentId,
        priority: r.priority ?? 'medium',
        title: r.title ?? 'Untitled recommendation',
        summary: r.summary ?? '',
        business: {
          level: r.businessImpact?.level ?? r.priority ?? 'medium',
          explanation:
            r.businessImpact?.explanation ?? 'Business impact inferred by specialist agent.',
          estimatedBenefit:
            r.businessImpact?.estimatedBenefit ?? 'Improved outcomes if addressed.',
        },
        technical: {
          level: r.technicalImpact?.level ?? 'medium',
          explanation:
            r.technicalImpact?.explanation ?? 'Requires engineering or content changes.',
          effort: r.technicalImpact?.effort ?? 'm',
        },
        actions: r.actions?.length ? r.actions : ['Review and implement recommended change'],
        confidence: r.confidence ?? 0.7,
        model: llm.model,
        promptVersion: prompt.id,
      }),
    );

    // Prefer LLM list but keep unique heuristic titles not covered
    const titles = new Set(llmRecs.map((r) => r.title.toLowerCase()));
    const merged = [
      ...llmRecs,
      ...input.heuristic.recommendations.filter((h) => !titles.has(h.title.toLowerCase())),
    ].slice(0, 8);

    return {
      agentId: input.agentId,
      label: input.heuristic.label,
      summary: parsed.summary ?? input.heuristic.summary,
      recommendations: merged,
      promptVersion: prompt.id,
      model: llm.model,
      generatedBy: 'hybrid',
      metrics: input.heuristic.metrics,
    };
  } catch {
    return input.heuristic;
  }
}

export function baseResult(
  agentId: AgentId,
  label: string,
  recommendations: Recommendation[],
  model: string,
  summary: string,
): AgentResult {
  const prompt = getActivePrompt(agentId);
  return {
    agentId,
    label,
    summary,
    recommendations,
    promptVersion: prompt.id,
    model,
    generatedBy: 'heuristic',
  };
}
