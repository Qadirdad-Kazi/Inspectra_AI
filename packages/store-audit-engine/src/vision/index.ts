/**
 * Multimodal helpers for icon/screenshot review.
 * Uses OpenAI / OpenRouter / Gemini vision when configured; otherwise heuristic-only.
 * Does NOT generate fix suggestions (prompt six scope).
 */

import {
  chatCompletions,
  isLlmAvailable,
  resolveLlmConfig,
  safeParseJson,
} from '@inspectra/llm';

export type VisionObservation = {
  target: string;
  observations: string[];
  risks: string[];
  qualityScore: number;
  source: 'heuristic' | 'vision-llm';
  /** Present when LLM is configured but the vision call failed */
  error?: string;
};

const MAX_INLINE_BYTES = 3_500_000;

function absoluteImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('//')) return `https:${imageUrl}`;
  return `https://${imageUrl.replace(/^\/+/, '')}`;
}

/**
 * Prefer base64 data URLs so OpenRouter/OpenAI do not need to fetch store CDNs
 * (Microsoft/Play/Akamai often block datacenter image fetches).
 */
async function toVisionImageUrl(imageUrl: string): Promise<string> {
  const abs = absoluteImageUrl(imageUrl);
  if (abs.startsWith('data:')) return abs;

  try {
    const res = await fetch(abs, {
      headers: {
        'User-Agent': 'InspectraAI/1.0 (+store-vision)',
        Accept: 'image/*,*/*',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      throw new Error(`image fetch ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error('empty image body');
    if (buf.length > MAX_INLINE_BYTES) {
      // Too large to inline — fall back to remote URL
      return abs;
    }
    const ctype = (res.headers.get('content-type') ?? 'image/jpeg')
      .split(';')[0]!
      .trim();
    if (!ctype.startsWith('image/')) {
      throw new Error(`non-image content-type ${ctype}`);
    }
    return `data:${ctype};base64,${buf.toString('base64')}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Still try remote URL — some providers can fetch public CDNs
    console.warn(`[store-vision] inline failed (${msg}); using remote URL`);
    return abs;
  }
}

function parseVisionJson(
  text: string,
): { observations: string[]; risks: string[]; qualityScore: number } | null {
  const parsed = safeParseJson<{
    observations?: unknown;
    risks?: unknown;
    qualityScore?: unknown;
    quality_score?: unknown;
  }>(text);
  if (!parsed) return null;

  const observations = Array.isArray(parsed.observations)
    ? parsed.observations.filter((x): x is string => typeof x === 'string')
    : [];
  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.filter((x): x is string => typeof x === 'string')
    : [];
  const rawScore = parsed.qualityScore ?? parsed.quality_score;
  const qualityScore =
    typeof rawScore === 'number'
      ? rawScore
      : typeof rawScore === 'string'
        ? Number(rawScore)
        : NaN;

  if (!observations.length && Number.isNaN(qualityScore)) return null;

  return {
    observations: observations.length ? observations : ['Vision model returned limited detail'],
    risks,
    qualityScore: Number.isFinite(qualityScore)
      ? Math.max(0, Math.min(100, Math.round(qualityScore)))
      : 60,
  };
}

async function analyzeWithVision(
  imageUrl: string,
  prompt: string,
): Promise<
  | { ok: true; data: { observations: string[]; risks: string[]; qualityScore: number } }
  | { ok: false; reason: string }
> {
  if (!imageUrl) return { ok: false, reason: 'missing image URL' };
  if (!isLlmAvailable()) {
    const cfg = resolveLlmConfig();
    return {
      ok: false,
      reason: `LLM unavailable (provider=${cfg.provider}; set OPENROUTER_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY and AI_PROVIDER=auto|openrouter)`,
    };
  }

  try {
    const visionUrl = await toVisionImageUrl(imageUrl);
    const result = await chatCompletions({
      vision: true,
      temperature: 0.2,
      json: true,
      timeoutMs: 60000,
      messages: [
        {
          role: 'system',
          content:
            'You are Inspectra store creative analyst. Return JSON {observations:string[], risks:string[], qualityScore:number}. Do NOT suggest how to fix — observe only.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: visionUrl } },
          ],
        },
      ],
    });
    if (!result?.text) {
      return { ok: false, reason: 'empty LLM response' };
    }
    const data = parseVisionJson(result.text);
    if (!data) {
      return {
        ok: false,
        reason: `unparseable vision JSON: ${result.text.slice(0, 120)}`,
      };
    }
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[store-vision] analyze failed: ${msg}`);
    return { ok: false, reason: msg };
  }
}

export async function observeIcon(iconUrl?: string): Promise<VisionObservation> {
  if (!iconUrl) {
    return {
      target: 'icon',
      observations: ['No icon URL available'],
      risks: ['Missing icon asset'],
      qualityScore: 0,
      source: 'heuristic',
    };
  }

  const vision = await analyzeWithVision(
    iconUrl,
    'Observe this mobile/store app icon. Note clarity, simplicity, contrast, and brand recognizability. No fix suggestions.',
  );
  if (vision.ok) {
    return { target: 'icon', ...vision.data, source: 'vision-llm' };
  }

  const configured = isLlmAvailable();
  return {
    target: 'icon',
    observations: configured
      ? ['Icon URL resolved', `Vision call failed: ${vision.reason}`]
      : [
          'Icon URL resolved for heuristic review',
          'Vision LLM not configured — using structural checks only',
        ],
    risks: [],
    qualityScore: 70,
    source: 'heuristic',
    error: vision.reason,
  };
}

export async function observeScreenshots(
  urls: string[],
): Promise<VisionObservation[]> {
  const sample = urls.slice(0, 3);
  const out: VisionObservation[] = [];
  for (const [i, url] of sample.entries()) {
    const vision = await analyzeWithVision(
      url,
      `Observe store screenshot #${i + 1}. Note text legibility, UI clutter, and marketing clarity. No fix suggestions.`,
    );
    if (vision.ok) {
      out.push({ target: `screenshot:${i + 1}`, ...vision.data, source: 'vision-llm' });
    } else {
      const configured = isLlmAvailable();
      out.push({
        target: `screenshot:${i + 1}`,
        observations: configured
          ? ['Screenshot URL present', `Vision call failed: ${vision.reason}`]
          : ['Screenshot URL present', 'Vision LLM not configured'],
        risks: [],
        qualityScore: 65,
        source: 'heuristic',
        error: vision.reason,
      });
    }
  }
  return out;
}
