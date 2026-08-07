import {
  STORE_CREATIVE_RULES,
  sanitizeStoreCopy,
} from './store-creative-rules.js';

export interface ScreenshotSlideSpec {
  id: string;
  headline: string;
  subhead: string;
  frameType:
    | 'iphone-17-a'
    | 'iphone-17-b'
    | 'iphone-17-c'
    | 'iphone-17-d'
    | 'iphone-17-e'
    | 'iphone-17-f'
    | 'tilted-hand'
    | 'browser-window'
    | 'android-pixel'
    | 'android-slim'
    | 'ipad-pro'
    | 'macbook';
  backgroundColor: string;
  gradientBackground?: string;
  textColor: string;
  badgeText?: string;
  rawImageIndex?: number;
  /** Story beat role for audit-safe sequencing */
  role?:
    | 'hero'
    | 'problem'
    | 'solution'
    | 'feature'
    | 'social-proof'
    | 'trust'
    | 'cta';
  /** Layout style for the client composer */
  layout?: 'hero-center' | 'copy-top' | 'device-left' | 'device-right';
  headlineY?: number;
  deviceY?: number;
  deviceX?: number;
  /** High-contrast caption color (always readable) */
  captionMutedColor?: string;
}

export interface ScreenshotSetGenerationResult {
  slides: ScreenshotSlideSpec[];
  suggestedTheme: string;
  colorPalette: string[];
  /** Echo of rules used — useful for Studio UI / audit alignment */
  creativePolicy: {
    frameCount: number;
    minFrames: number;
    targetQuality: number;
    stores: string[];
  };
}

function framesForPlatform(
  platform: string,
  count: number,
): ScreenshotSlideSpec['frameType'][] {
  const ios: ScreenshotSlideSpec['frameType'][] = [
    'iphone-17-b',
    'iphone-17-c',
    'iphone-17-a',
    'tilted-hand',
    'iphone-17-d',
    'iphone-17-e',
    'iphone-17-f',
    'iphone-17-b',
  ];
  const android: ScreenshotSlideSpec['frameType'][] = [
    'android-pixel',
    'android-slim',
    'android-pixel',
    'tilted-hand',
    'android-slim',
    'android-pixel',
    'android-slim',
    'android-pixel',
  ];
  const desktop: ScreenshotSlideSpec['frameType'][] = [
    'browser-window',
    'macbook',
    'ipad-pro',
    'browser-window',
    'macbook',
    'ipad-pro',
    'browser-window',
    'macbook',
  ];

  const pool =
    platform === 'android' ? android : platform === 'web' || platform === 'msstore' ? desktop : ios;

  return Array.from({ length: count }, (_, i) => pool[i % pool.length]!);
}

const LAYOUTS: Array<NonNullable<ScreenshotSlideSpec['layout']>> = [
  'hero-center',
  'copy-top',
  'device-right',
  'device-left',
  'copy-top',
  'hero-center',
  'device-right',
  'device-left',
];

function layoutCoords(layout: NonNullable<ScreenshotSlideSpec['layout']>) {
  // Keep marketing copy in the upper band so it never fights device glass
  switch (layout) {
    case 'copy-top':
      return { headlineY: 14, deviceY: 64, deviceX: 50 };
    case 'device-left':
      return { headlineY: 16, deviceY: 60, deviceX: 40 };
    case 'device-right':
      return { headlineY: 16, deviceY: 60, deviceX: 60 };
    case 'hero-center':
    default:
      return { headlineY: 15, deviceY: 65, deviceX: 50 };
  }
}

type Beat = {
  role: NonNullable<ScreenshotSlideSpec['role']>;
  headline: string;
  subhead: string;
  badgeText: string;
};

function storyBeats(params: {
  appName: string;
  appDescription?: string;
  targetPlatform: string;
  auditFindingsSummary?: string[];
  hasImages: boolean;
}): Beat[] {
  const { appName, appDescription, targetPlatform, auditFindingsSummary, hasImages } = params;
  const shortDesc = (appDescription || '').trim().slice(0, 70);
  const finding = auditFindingsSummary?.[0]?.replace(/^Screenshot.*?:\s*/i, '').slice(0, 70);

  const platformHero =
    targetPlatform === 'android'
      ? 'Built for Android'
      : targetPlatform === 'msstore' || targetPlatform === 'web'
        ? 'Work without friction'
        : 'Designed for iPhone';

  return [
    {
      role: 'hero',
      headline: clampHeadline(appName.length <= 24 ? appName : platformHero),
      subhead: clampSubhead(
        shortDesc || 'Clear value in seconds — ready for the store.',
      ),
      badgeText: 'New',
    },
    {
      role: 'problem',
      headline: 'Skip the guesswork',
      subhead: clampSubhead(
        finding || 'Know what holds installs back before you ship.',
      ),
      badgeText: 'Clarity',
    },
    {
      role: 'solution',
      headline: hasImages ? 'See the product' : 'One clear path',
      subhead: clampSubhead(
        hasImages
          ? 'Real UI in premium frames — easy to scan, hard to ignore.'
          : 'Guided flows that feel fast, safe, and simple.',
      ),
      badgeText: 'Product',
    },
    {
      role: 'feature',
      headline: 'Results you can trust',
      subhead: clampSubhead('Actionable insights without noise or clutter.'),
      badgeText: 'Insight',
    },
    {
      role: 'trust',
      headline: clampHeadline(`${appName} clarity`),
      subhead: clampSubhead(
        shortDesc || 'Straightforward messaging that matches what the product actually does.',
      ),
      badgeText: 'Clear',
    },
    {
      role: 'cta',
      headline: 'Ready for the store',
      subhead: clampSubhead(
        shortDesc
          ? `Highlight ${appName} with frames built around your real screenshots.`
          : `Build frames around ${appName} with your real screenshots.`,
      ),
      badgeText: 'Next',
    },
    {
      role: 'social-proof',
      headline: clampHeadline(`Why ${appName}`),
      subhead: clampSubhead(
        finding || 'Lead with the benefit users notice in the first two seconds.',
      ),
      badgeText: 'Focus',
    },
    {
      role: 'feature',
      headline: 'Stay consistent',
      subhead: clampSubhead('Same story across every store frame — no filler claims.'),
      badgeText: 'Polish',
    },
  ];
}

function clampHeadline(text: string): string {
  return (
    sanitizeStoreCopy({ headline: text }).headline ||
    text.slice(0, STORE_CREATIVE_RULES.maxHeadlineChars)
  );
}

function clampSubhead(text: string): string {
  return (
    sanitizeStoreCopy({ subhead: text }).subhead ||
    text.slice(0, STORE_CREATIVE_RULES.maxSubheadChars)
  );
}

/** High-contrast professional palettes (pass vision legibility). */
function paletteForTheme(
  theme: string | undefined,
  primaryColor: string,
): {
  backgrounds: string[];
  textColor: string;
  mutedColor: string;
  solid: string[];
} {
  const isMinimal = theme === 'minimal';

  if (isMinimal) {
    return {
      textColor: '#0f172a',
      mutedColor: '#475569',
      solid: ['#f8fafc', '#f1f5f9', '#eef2ff', '#ecfeff', '#fafaf9', '#f8fafc'],
      backgrounds: [
        'linear-gradient(165deg, #f8fafc 0%, #e2e8f0 100%)',
        `linear-gradient(165deg, #ffffff 0%, ${primaryColor}18 100%)`,
        'linear-gradient(165deg, #f1f5f9 0%, #e0f2fe 100%)',
        'linear-gradient(165deg, #fafaf9 0%, #fef3c7 100%)',
        'linear-gradient(165deg, #f8fafc 0%, #ede9fe 100%)',
        'linear-gradient(165deg, #ffffff 0%, #dcfce7 100%)',
      ],
    };
  }

  return {
    textColor: '#ffffff',
    mutedColor: '#cbd5e1',
    solid: ['#0b1220', '#020617', '#090d16', '#111827', '#0c1a3a', '#0f172a'],
    backgrounds: [
      `linear-gradient(165deg, #0b1220 0%, #132033 48%, ${primaryColor}40 100%)`,
      'linear-gradient(165deg, #020617 0%, #0c1a3a 100%)',
      'linear-gradient(165deg, #090d16 0%, #064e3b 100%)',
      'linear-gradient(165deg, #111827 0%, #4c1d95 100%)',
      `linear-gradient(165deg, #0f172a 0%, ${primaryColor}55 100%)`,
      'linear-gradient(165deg, #0c1a3a 0%, #1e3a5f 100%)',
    ],
  };
}

export function generateScreenshotSetSpecs(params: {
  appName: string;
  appDescription?: string;
  targetPlatform: string;
  theme?: string;
  primaryColor?: string;
  auditFindingsSummary?: string[];
  rawImageCount?: number;
  /** Override frame count (clamped to 5–8 for audit safety) */
  frameCount?: number;
}): ScreenshotSetGenerationResult {
  const mainColor = params.primaryColor || '#22d3ee';
  const hasImages = (params.rawImageCount ?? 0) > 0;
  const frameCount = Math.min(
    STORE_CREATIVE_RULES.maxFrames,
    Math.max(
      STORE_CREATIVE_RULES.minFrames,
      params.frameCount ?? STORE_CREATIVE_RULES.targetFrames,
    ),
  );

  const frames = framesForPlatform(params.targetPlatform, frameCount);
  const beats = storyBeats({
    appName: params.appName,
    appDescription: params.appDescription,
    targetPlatform: params.targetPlatform,
    auditFindingsSummary: params.auditFindingsSummary,
    hasImages,
  }).slice(0, frameCount);

  const palette = paletteForTheme(params.theme, mainColor);

  const slides: ScreenshotSlideSpec[] = beats.map((beat, i) => {
    const layout = LAYOUTS[i % LAYOUTS.length]!;
    const coords = layoutCoords(layout);
    return {
      id: `slide-${i + 1}`,
      role: beat.role,
      headline: beat.headline,
      subhead: beat.subhead,
      badgeText: beat.badgeText,
      frameType: frames[i]!,
      backgroundColor: palette.solid[i % palette.solid.length]!,
      gradientBackground: palette.backgrounds[i % palette.backgrounds.length]!,
      textColor: palette.textColor,
      captionMutedColor: palette.mutedColor,
      rawImageIndex: hasImages ? i % Math.max(1, params.rawImageCount ?? 1) : undefined,
      layout,
      ...coords,
    };
  });

  return {
    slides,
    suggestedTheme: params.theme || 'dark',
    colorPalette: [mainColor, '#6366f1', '#14b8a6', '#f59e0b'],
    creativePolicy: {
      frameCount,
      minFrames: STORE_CREATIVE_RULES.minFrames,
      targetQuality: STORE_CREATIVE_RULES.minQualityTarget,
      stores: ['ios', 'android', 'msstore', 'web'],
    },
  };
}
