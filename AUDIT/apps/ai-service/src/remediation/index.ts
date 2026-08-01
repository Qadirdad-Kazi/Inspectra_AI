import {
  runIntelligence,
  createInMemoryStore,
  listPromptVersions,
  resolveModelSelection,
  type IntelligenceInput,
} from '@inspectra/ai-intelligence';

/** HTTP entry for the modular AI orchestrator (not a chatbot). */
export async function runRemediationOrchestrator(body: unknown) {
  const payload = (body ?? {}) as Partial<IntelligenceInput> & {
    findings?: IntelligenceInput['findings'];
    scores?: IntelligenceInput['scores'];
  };

  if (!payload.organizationId || !payload.assetId || !payload.auditId) {
    return {
      status: 'error',
      code: 'MISSING_CONTEXT',
      message: 'organizationId, assetId, and auditId are required',
    };
  }

  if (!payload.findings || !payload.scores) {
    return {
      status: 'error',
      code: 'MISSING_AUDIT_RESULTS',
      message: 'findings and scores are required',
    };
  }

  const result = await runIntelligence({
    kind: payload.kind ?? 'website',
    organizationId: payload.organizationId,
    assetId: payload.assetId,
    auditId: payload.auditId,
    target: payload.target ?? { label: 'target' },
    scores: payload.scores,
    findings: payload.findings,
    extras: payload.extras,
    agents: payload.agents,
    enableLlm: payload.enableLlm,
    modelConfig: payload.modelConfig,
    memory: payload.memory ?? createInMemoryStore(),
  });

  return {
    status: 'ok',
    module: 'intelligence',
    executiveSummary: result.executiveSummary,
    recommendations: result.recommendations,
    agents: result.agents,
    modelSelection: result.modelSelection,
    promptVersions: result.promptVersions,
    generatedBy: result.generatedBy,
  };
}

export function intelligenceMeta() {
  return {
    prompts: listPromptVersions().map((p) => ({
      id: p.id,
      agentId: p.agentId,
      version: p.version,
      label: p.label,
    })),
    models: resolveModelSelection(),
  };
}
