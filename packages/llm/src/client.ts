import { resolveLlmConfig, type LlmConfig } from './config.js';

export type ChatTextPart = { type: 'text'; text: string };
export type ChatImagePart = { type: 'image_url'; image_url: { url: string } };
export type ChatContent = string | Array<ChatTextPart | ChatImagePart>;

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: ChatContent;
};

export type LlmChatResult = {
  text: string;
  model: string;
  provider: string;
  usage?: { promptTokens?: number; completionTokens?: number };
};

export type ChatCompletionsInput = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Use vision model default when true */
  vision?: boolean;
  timeoutMs?: number;
  config?: LlmConfig;
};

/**
 * OpenAI-compatible chat completions (OpenAI, OpenRouter, Gemini OpenAI endpoint).
 * Returns null when no provider/key is configured.
 */
export async function chatCompletions(
  input: ChatCompletionsInput,
): Promise<LlmChatResult | null> {
  const config = input.config ?? resolveLlmConfig();
  if (!config.available || !config.apiKey) return null;

  const model =
    input.model ?? (input.vision ? config.visionModel : config.defaultModel);

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1800,
      ...(input.json ? { response_format: { type: 'json_object' } } : {}),
      messages: input.messages,
    }),
    signal: AbortSignal.timeout(input.timeoutMs ?? 45000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `LLM request failed (${config.provider} ${res.status}): ${body.slice(0, 240)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    text: data.choices?.[0]?.message?.content ?? '{}',
    model: data.model ?? model,
    provider: config.provider,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    },
  };
}

export function safeParseJson<T>(text: string): T | null {
  const raw = text?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    /* continue */
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      /* continue */
    }
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  return null;
}
