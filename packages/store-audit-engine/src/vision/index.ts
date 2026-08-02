/**
 * Multimodal helpers for icon/screenshot review.
 * Uses OpenAI / OpenRouter / Gemini vision when configured; otherwise heuristic-only.
 * Does NOT generate fix suggestions (prompt six scope).
 */

import { chatCompletions, isLlmAvailable, safeParseJson } from '@inspectra/llm';

export type VisionObservation = {
  target: string;
  observations: string[];
  risks: string[];
  qualityScore: number;
  source: 'heuristic' | 'vision-llm';
};

async function analyzeWithVision(
  imageUrl: string,
  prompt: string,
): Promise<{ observations: string[]; risks: string[]; qualityScore: number } | null> {
  if (!isLlmAvailable() || !imageUrl) return null;

  try {
    const result = await chatCompletions({
      vision: true,
      temperature: 0.2,
      json: true,
      timeoutMs: 45000,
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
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });
    if (!result?.text) return null;
    return safeParseJson<{
      observations: string[];
      risks: string[];
      qualityScore: number;
    }>(result.text);
  } catch {
    return null;
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
  if (vision) {
    return { target: 'icon', ...vision, source: 'vision-llm' };
  }

  return {
    target: 'icon',
    observations: [
      'Icon URL resolved for heuristic review',
      'Vision LLM not configured — using structural checks only',
    ],
    risks: [],
    qualityScore: 70,
    source: 'heuristic',
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
    if (vision) {
      out.push({ target: `screenshot:${i + 1}`, ...vision, source: 'vision-llm' });
    } else {
      out.push({
        target: `screenshot:${i + 1}`,
        observations: ['Screenshot URL present', 'Vision LLM not configured'],
        risks: [],
        qualityScore: 65,
        source: 'heuristic',
      });
    }
  }
  return out;
}
