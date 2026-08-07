/**
 * Store creative rules aligned with Inspectra's own screenshot/icon audit module.
 *
 * Audit thresholds (store-audit-engine):
 * - 0 screens → critical
 * - < 3 screens → medium penalty
 * - ASO: < 4 screens → medium penalty
 * - Guidance text: 5–8 frames typical
 * - Vision qualityScore avg < 55 → creative quality concerns
 * Vision observes: text legibility, UI clutter, marketing clarity
 */

export type StorePlatform = 'ios' | 'android' | 'msstore' | 'web';

export const STORE_CREATIVE_RULES = {
  /** Minimum frames to avoid Inspectra shot/few + ASO few findings */
  minFrames: 5,
  /** Target set size (audit guidance: 5–8) */
  targetFrames: 6,
  maxFrames: 8,
  /** Headlines must stay short for legibility on phone-sized creatives */
  maxHeadlineWords: 6,
  maxHeadlineChars: 42,
  maxSubheadChars: 72,
  maxBadgeWords: 2,
  /** Vision quality soft target — stay well above audit fail (< 55) */
  minQualityTarget: 75,
} as const;

export const STORE_CREATIVE_SYSTEM_PROMPT = `You are Inspectra Studio's store creative director.
You write App Store, Google Play, Microsoft Store, and web/store screenshot marketing copy.

Your job: produce visuals that would PASS Inspectra's own store audit for screenshots.
Inspectra's auditor scores screenshot creative quality (text legibility, UI clutter, marketing clarity).
Quality below 55 fails the audit. Target professional quality ≥ 75.

HARD RULES (must follow):
1. Exactly the requested number of slides (typically 6).
2. Headlines: ≤ 6 words, ≤ 42 characters. Benefit-led, concrete, no fluff.
3. Subheads: ≤ 72 characters. One clear supporting benefit. No paragraphs.
4. Badge text: ≤ 2 words (e.g. "New", "Secure", "Fast").
5. High contrast copy: assume dark or light store frames — never low-contrast gray-on-gray wording.
6. No clutter: one idea per frame. No stacked CTAs, no legal disclaimers, no keyword stuffing.
7. No misleading claims ("#1", "best", "guaranteed") unless the user provided verified proof.
8. No emoji, no ALL CAPS headlines, no exclamation spam.
9. Each slide must tell a different story beat (problem → solution → proof → feature → trust → CTA).
10. Copy must be specific to the app name + description — never generic "Your all-in-one solution".
11. Prefer plain language a first-time store visitor understands in under 2 seconds.
12. Avoid overlapping text-on-UI advice — keep marketing copy OUTSIDE the phone glass conceptually (short overlay captions).

PLATFORM TONE:
- ios: premium, calm, benefit-first (Apple HIG marketing style)
- android: clear, energetic, feature + outcome (Play Store conversion style)
- msstore / web: professional productivity, clarity, trust

Return JSON only:
{ "slides": [ { "headline": string, "subhead": string, "badgeText": string } ] }`;

export function storeCreativeUserPrompt(input: {
  appName: string;
  appDescription?: string;
  platform: string;
  theme?: string;
  slideCount: number;
  findings?: string[];
  seedSlides: Array<{ headline: string; subhead: string; badgeText?: string; role?: string }>;
}): string {
  return JSON.stringify(
    {
      task: 'Write audit-safe store screenshot copy',
      appName: input.appName,
      appDescription: input.appDescription,
      platform: input.platform,
      theme: input.theme,
      slideCount: input.slideCount,
      auditContext: {
        mustPassInspectraScreenshotAudit: true,
        minFrames: STORE_CREATIVE_RULES.minFrames,
        targetQualityScore: STORE_CREATIVE_RULES.minQualityTarget,
        visionChecks: ['text_legibility', 'no_ui_clutter', 'marketing_clarity'],
        avoidFindings: [
          'shot/few',
          'shot/quality',
          'Insufficient screenshot coverage',
          'Screenshot creative quality concerns',
        ],
      },
      priorAuditFindings: input.findings?.slice(0, 6) ?? [],
      storyBeats: input.seedSlides.map((s, i) => ({
        index: i + 1,
        role: s.role,
        seedHeadline: s.headline,
        seedSubhead: s.subhead,
        seedBadge: s.badgeText,
      })),
      constraints: {
        maxHeadlineWords: STORE_CREATIVE_RULES.maxHeadlineWords,
        maxHeadlineChars: STORE_CREATIVE_RULES.maxHeadlineChars,
        maxSubheadChars: STORE_CREATIVE_RULES.maxSubheadChars,
        maxBadgeWords: STORE_CREATIVE_RULES.maxBadgeWords,
      },
    },
    null,
    0,
  );
}

/** Clamp LLM copy into audit-safe lengths. */
export function sanitizeStoreCopy(input: {
  headline?: string;
  subhead?: string;
  badgeText?: string;
}): { headline?: string; subhead?: string; badgeText?: string } {
  const clampWords = (text: string, maxWords: number, maxChars: number) => {
    const words = text
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, maxWords);
    let out = words.join(' ');
    if (out.length > maxChars) out = out.slice(0, maxChars).trim();
    return out.replace(/[!?]{2,}/g, '!').replace(/[#⭐]/g, '').trim();
  };

  return {
    headline: input.headline
      ? clampWords(input.headline, STORE_CREATIVE_RULES.maxHeadlineWords, STORE_CREATIVE_RULES.maxHeadlineChars)
      : undefined,
    subhead: input.subhead
      ? clampWords(input.subhead, 14, STORE_CREATIVE_RULES.maxSubheadChars)
      : undefined,
    badgeText: input.badgeText
      ? clampWords(input.badgeText, STORE_CREATIVE_RULES.maxBadgeWords, 16)
      : undefined,
  };
}
