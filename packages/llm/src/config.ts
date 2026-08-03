export type LlmProviderId = 'openai' | 'openrouter' | 'gemini' | 'none';

export type LlmConfig = {
  provider: LlmProviderId;
  apiKey: string | null;
  baseUrl: string;
  defaultModel: string;
  visionModel: string;
  available: boolean;
  /** Extra headers (OpenRouter referer/title, etc.) */
  headers: Record<string, string>;
};

const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
/** Google Gemini OpenAI-compatible endpoint */
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    let v = process.env[key]?.trim();
    if (!v) continue;
    // Common paste mistake: KEY="value" stored with quotes
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).trim();
    }
    if (v) return v;
  }
  return undefined;
}

function normalizeProvider(raw: string | undefined): LlmProviderId | 'auto' | 'stub' {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v || v === 'auto') return 'auto';
  if (v === 'stub' || v === 'none' || v === 'off' || v === 'false') return 'stub';
  if (v === 'openai') return 'openai';
  if (v === 'openrouter' || v === 'open-router') return 'openrouter';
  if (v === 'gemini' || v === 'google' || v === 'google-gemini') return 'gemini';
  return 'auto';
}

function defaultsFor(provider: Exclude<LlmProviderId, 'none'>): {
  baseUrl: string;
  defaultModel: string;
  visionModel: string;
  headers: Record<string, string>;
} {
  if (provider === 'openrouter') {
    return {
      baseUrl: firstEnv('LLM_BASE_URL', 'OPENROUTER_BASE_URL') ?? OPENROUTER_BASE,
      defaultModel:
        firstEnv('LLM_MODEL', 'OPENROUTER_MODEL', 'OPENAI_MODEL') ??
        'google/gemini-2.5-flash',
      visionModel:
        firstEnv('LLM_VISION_MODEL', 'OPENROUTER_VISION_MODEL', 'OPENAI_VISION_MODEL') ??
        'google/gemini-2.5-flash',
      headers: {
        'HTTP-Referer': firstEnv('OPENROUTER_SITE_URL', 'WEB_URL') ?? 'https://inspectra.ai',
        'X-Title': firstEnv('OPENROUTER_APP_NAME') ?? 'Inspectra AI',
      },
    };
  }
  if (provider === 'gemini') {
    return {
      baseUrl: firstEnv('LLM_BASE_URL', 'GEMINI_BASE_URL') ?? GEMINI_BASE,
      defaultModel:
        firstEnv('LLM_MODEL', 'GEMINI_MODEL', 'OPENAI_MODEL') ?? 'gemini-2.0-flash',
      visionModel:
        firstEnv('LLM_VISION_MODEL', 'GEMINI_VISION_MODEL', 'OPENAI_VISION_MODEL') ??
        'gemini-2.0-flash',
      headers: {},
    };
  }
  return {
    baseUrl: firstEnv('LLM_BASE_URL', 'OPENAI_BASE_URL') ?? OPENAI_BASE,
    defaultModel: firstEnv('LLM_MODEL', 'OPENAI_MODEL') ?? 'gpt-4o-mini',
    visionModel:
      firstEnv('LLM_VISION_MODEL', 'OPENAI_VISION_MODEL', 'OPENAI_MODEL') ?? 'gpt-4o-mini',
    headers: {},
  };
}

function keyFor(provider: Exclude<LlmProviderId, 'none'>): string | undefined {
  if (provider === 'openrouter') {
    return firstEnv('OPENROUTER_API_KEY', 'LLM_API_KEY');
  }
  if (provider === 'gemini') {
    return firstEnv('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'LLM_API_KEY');
  }
  return firstEnv('OPENAI_API_KEY', 'LLM_API_KEY');
}

function pickAutoProvider(): Exclude<LlmProviderId, 'none'> | null {
  if (keyFor('openrouter')) return 'openrouter';
  if (keyFor('gemini')) return 'gemini';
  if (keyFor('openai')) return 'openai';
  return null;
}

/**
 * Resolve active chat/vision LLM from env.
 *
 * Set `AI_PROVIDER` or `AI_DEFAULT_PROVIDER` to:
 * - `openai` | `openrouter` | `gemini`
 * - `auto` (first available key)
 * - `stub` / `none` (disable LLM even if keys exist)
 */
export function resolveLlmConfig(): LlmConfig {
  const requested = normalizeProvider(
    firstEnv('AI_PROVIDER', 'AI_DEFAULT_PROVIDER'),
  );

  if (requested === 'stub') {
    return {
      provider: 'none',
      apiKey: null,
      baseUrl: OPENAI_BASE,
      defaultModel: 'none',
      visionModel: 'none',
      available: false,
      headers: {},
    };
  }

  const provider =
    requested === 'auto' ? pickAutoProvider() : (requested as Exclude<LlmProviderId, 'none'>);

  if (!provider) {
    return {
      provider: 'none',
      apiKey: null,
      baseUrl: OPENAI_BASE,
      defaultModel: 'none',
      visionModel: 'none',
      available: false,
      headers: {},
    };
  }

  const apiKey = keyFor(provider) ?? null;
  const defaults = defaultsFor(provider);

  return {
    provider,
    apiKey,
    baseUrl: defaults.baseUrl.replace(/\/$/, ''),
    defaultModel: defaults.defaultModel,
    visionModel: defaults.visionModel,
    available: Boolean(apiKey),
    headers: defaults.headers,
  };
}

export function isLlmAvailable(): boolean {
  return resolveLlmConfig().available;
}
