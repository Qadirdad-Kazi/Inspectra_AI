import { redactText } from '@inspectra/redaction';
import {
  chatCompletions,
  resolveLlmConfig,
  safeParseJson,
  type LlmChatResult as SharedLlmChatResult,
} from '@inspectra/llm';

export type LlmChatResult = {
  text: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
};

/** Thin multi-provider chat client with prompt redaction. Returns null when unavailable. */
export async function chatJson(input: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<LlmChatResult | null> {
  const result: SharedLlmChatResult | null = await chatCompletions({
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    json: true,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: redactText(input.user) },
    ],
  });
  if (!result) return null;
  return {
    text: result.text,
    model: result.model,
    usage: result.usage,
  };
}

export { safeParseJson, resolveLlmConfig };
