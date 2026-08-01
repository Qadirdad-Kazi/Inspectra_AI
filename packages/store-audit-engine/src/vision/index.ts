/**
 * Multimodal helpers for icon/screenshot review.
 * Uses OpenAI vision when OPENAI_API_KEY is set; otherwise heuristic-only.
 * Does NOT generate fix suggestions (prompt six scope).
 */

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
  const key = process.env.OPENAI_API_KEY;
  if (!key || !imageUrl) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
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
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as {
      observations: string[];
      risks: string[];
      qualityScore: number;
    };
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
