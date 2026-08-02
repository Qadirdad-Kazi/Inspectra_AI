import type { AgentId, ModelSelectionConfig } from '../types/index.js';
import { resolveLlmConfig, type LlmProviderId } from '@inspectra/llm';

/** Resolve which model each agent should use. */
export function resolveModelSelection(
  config?: ModelSelectionConfig,
): {
  provider: LlmProviderId;
  defaultModel: string;
  agentModels: Partial<Record<AgentId, string>>;
  temperature: number;
  maxTokens: number;
  llmAvailable: boolean;
} {
  const llm = resolveLlmConfig();
  const provider: LlmProviderId =
    config?.provider === 'none' ? 'none' : llm.available ? llm.provider : 'none';

  return {
    provider,
    defaultModel: config?.defaultModel ?? llm.defaultModel,
    agentModels: { ...(config?.agentModels ?? {}) },
    temperature: config?.temperature ?? 0.2,
    maxTokens: config?.maxTokens ?? 1800,
    llmAvailable: provider !== 'none' && llm.available,
  };
}

export function modelForAgent(
  agentId: AgentId,
  selection: ReturnType<typeof resolveModelSelection>,
): string {
  return selection.agentModels[agentId] ?? selection.defaultModel;
}
