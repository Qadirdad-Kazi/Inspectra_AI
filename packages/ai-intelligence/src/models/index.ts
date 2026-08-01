import type { AgentId, ModelSelectionConfig } from '../types/index.js';

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

/** Resolve which model each agent should use. */
export function resolveModelSelection(
  config?: ModelSelectionConfig,
): {
  provider: 'openai' | 'none';
  defaultModel: string;
  agentModels: Partial<Record<AgentId, string>>;
  temperature: number;
  maxTokens: number;
  llmAvailable: boolean;
} {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const provider =
    config?.provider === 'none' ? 'none' : hasKey ? 'openai' : 'none';

  return {
    provider,
    defaultModel: config?.defaultModel ?? DEFAULT_MODEL,
    agentModels: { ...(config?.agentModels ?? {}) },
    temperature: config?.temperature ?? 0.2,
    maxTokens: config?.maxTokens ?? 1800,
    llmAvailable: provider === 'openai' && hasKey,
  };
}

export function modelForAgent(
  agentId: AgentId,
  selection: ReturnType<typeof resolveModelSelection>,
): string {
  return selection.agentModels[agentId] ?? selection.defaultModel;
}
