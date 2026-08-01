import type {
  AgentResult,
  IntelligenceInput,
  IntelligenceOutput,
  Recommendation,
} from '../types/index.js';
import { resolveModelSelection, modelForAgent } from '../models/index.js';
import { getActivePrompt, ACTIVE_PROMPTS } from '../prompts/registry.js';
import { createInMemoryStore, memoryDigest } from '../memory/index.js';
import { agentsForKind } from '../agents/index.js';
import { prioritizeRecommendations } from '../ranking/index.js';
import { chatJson, safeParseJson } from '../llm/client.js';
import { makeRec, type AgentContext } from '../agents/helpers.js';

async function synthesizeReport(input: {
  ctx: AgentContext;
  agentResults: AgentResult[];
  prioritized: Recommendation[];
}): Promise<{ executiveSummary: string; generatedBy: IntelligenceOutput['generatedBy'] }> {
  const weak = [...input.ctx.input.scores.breakdown]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const top = input.prioritized.slice(0, 5);

  const heuristicSummary = [
    `Inspectra AI orchestrator reviewed ${input.ctx.input.target.label} (${input.ctx.input.kind}) at ${input.ctx.input.scores.overall}/100.`,
    weak.length
      ? `Lowest modules: ${weak.map((w) => `${w.label} (${w.score})`).join(', ')}.`
      : '',
    `${input.prioritized.length} prioritized recommendation(s) across ${input.agentResults.length} specialist agent(s).`,
    top.length
      ? `Top actions: ${top.map((t) => t.title).join('; ')}.`
      : 'No urgent actions — maintain monitoring cadence.',
  ]
    .filter(Boolean)
    .join(' ');

  if (!input.ctx.enableLlm || !input.ctx.selection.llmAvailable) {
    return { executiveSummary: heuristicSummary, generatedBy: 'heuristic' };
  }

  const prompt = getActivePrompt('report_writer');
  const model = modelForAgent('report_writer', input.ctx.selection);

  try {
    const llm = await chatJson({
      model,
      system: prompt.system,
      temperature: input.ctx.selection.temperature,
      user: JSON.stringify({
        target: input.ctx.input.target,
        scores: input.ctx.input.scores,
        memory: input.ctx.memoryDigest,
        agentSummaries: input.agentResults.map((a) => ({
          agentId: a.agentId,
          summary: a.summary,
          count: a.recommendations.length,
        })),
        topRecommendations: top.map((r) => ({
          title: r.title,
          priority: r.priority,
          business: r.businessImpact.explanation,
          technical: r.technicalImpact.explanation,
        })),
      }),
    });

    const parsed = safeParseJson<{ executiveSummary?: string }>(llm?.text ?? '');
    if (parsed?.executiveSummary) {
      return { executiveSummary: parsed.executiveSummary, generatedBy: 'hybrid' };
    }
  } catch {
    // fall through
  }

  return { executiveSummary: heuristicSummary, generatedBy: 'heuristic' };
}

/**
 * Modular AI orchestrator — routes audit results to specialist agents,
 * ranks recommendations, writes memory, and emits a leadership-ready report.
 * Not a chatbot.
 */
export async function runIntelligence(
  input: IntelligenceInput,
): Promise<IntelligenceOutput> {
  const selection = resolveModelSelection(input.modelConfig);
  const enableLlm = input.enableLlm !== false;
  const memory = input.memory ?? createInMemoryStore();

  const prior = await memory.list({
    organizationId: input.organizationId,
    assetId: input.assetId,
    limit: 40,
  });
  const digest = memoryDigest(prior);

  const ctx: AgentContext = {
    input,
    memoryDigest: digest,
    selection,
    enableLlm,
  };

  const specialists = agentsForKind(input.kind, input.agents);
  const agentResults: AgentResult[] = [];

  for (const [index, agent] of specialists.entries()) {
    await input.onProgress?.({
      stage: agent.id,
      message: `Running ${agent.label} agent`,
      progress: 0.1 + (index / Math.max(1, specialists.length)) * 0.7,
    });
    agentResults.push(await agent.run(ctx));
  }

  await input.onProgress?.({
    stage: 'report_writer',
    message: 'Synthesizing prioritized recommendations',
    progress: 0.85,
  });

  const flat = agentResults.flatMap((a) => a.recommendations);
  const prioritized = prioritizeRecommendations(flat);

  // Ensure report_writer prompt version is recorded even when synthesis is heuristic
  const reportPrompt = getActivePrompt('report_writer');
  agentResults.push({
    agentId: 'report_writer',
    label: 'Report writer',
    summary: `Merged ${prioritized.length} recommendations.`,
    recommendations: prioritized.slice(0, 3).map((r) =>
      makeRec({
        agentId: 'report_writer',
        priority: r.priority,
        title: `Report highlight: ${r.title}`,
        summary: r.summary,
        business: r.businessImpact,
        technical: r.technicalImpact,
        actions: r.actions.slice(0, 2),
        relatedFindings: r.relatedFindings,
        confidence: r.confidence,
        model: modelForAgent('report_writer', selection),
        promptVersion: reportPrompt.id,
      }),
    ),
    promptVersion: reportPrompt.id,
    model: modelForAgent('report_writer', selection),
    generatedBy: 'heuristic',
  });

  const { executiveSummary, generatedBy } = await synthesizeReport({
    ctx,
    agentResults,
    prioritized,
  });

  const memoryWritten: IntelligenceOutput['memoryWritten'] = [];

  await memory.put({
    organizationId: input.organizationId,
    assetId: input.assetId,
    auditId: input.auditId,
    key: 'last_intelligence_run',
    kind: 'insight',
    content: {
      overall: input.scores.overall,
      kind: input.kind,
      topTitles: prioritized.slice(0, 5).map((r) => r.title),
      generatedBy,
    },
    promptVersion: reportPrompt.id,
  });
  memoryWritten.push({ key: 'last_intelligence_run', kind: 'insight' });

  for (const r of prioritized.slice(0, 8)) {
    const key = `rec:${r.id}`;
    await memory.put({
      organizationId: input.organizationId,
      assetId: input.assetId,
      auditId: input.auditId,
      key,
      kind: 'prior_recommendation',
      content: {
        title: r.title,
        priority: r.priority,
        agentId: r.agentId,
        businessImpact: r.businessImpact,
        technicalImpact: r.technicalImpact,
      },
      promptVersion: r.promptVersion,
    });
    memoryWritten.push({ key, kind: 'prior_recommendation' });
  }

  const patternCats = [...new Set(input.findings.map((f) => f.category))].slice(0, 10);
  await memory.put({
    organizationId: input.organizationId,
    assetId: input.assetId,
    auditId: input.auditId,
    key: 'finding_categories',
    kind: 'finding_pattern',
    content: { categories: patternCats, count: input.findings.length },
  });
  memoryWritten.push({ key: 'finding_categories', kind: 'finding_pattern' });

  await input.onProgress?.({
    stage: 'complete',
    message: 'AI intelligence complete',
    progress: 1,
  });

  const llmUsed =
    enableLlm &&
    selection.llmAvailable &&
    (generatedBy !== 'heuristic' ||
      agentResults.some((a) => a.generatedBy === 'llm' || a.generatedBy === 'hybrid'));

  return {
    executiveSummary,
    recommendations: prioritized,
    agents: agentResults,
    memoryWritten,
    modelSelection: {
      provider: selection.provider,
      defaultModel: selection.defaultModel,
      agentModels: selection.agentModels,
      llmUsed,
    },
    promptVersions: { ...ACTIVE_PROMPTS },
    generatedBy: llmUsed ? (generatedBy === 'heuristic' ? 'hybrid' : generatedBy) : 'heuristic',
    legacyReport: {
      title: `AI intelligence — ${input.target.label}`,
      executiveSummary,
      recommendations: prioritized.slice(0, 12).map((r) => ({
        priority: r.priority,
        title: r.title,
        detail: [
          r.summary,
          `Business: ${r.businessImpact.explanation} (${r.businessImpact.estimatedBenefit})`,
          `Technical: ${r.technicalImpact.explanation} [effort=${r.technicalImpact.effort}]`,
          r.actions.length ? `Actions: ${r.actions.join(' | ')}` : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
      generatedBy: llmUsed ? 'llm' : 'template',
    },
  };
}
