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
  /** Layout style for the client composer */
  layout?: 'hero-center' | 'copy-top' | 'device-left' | 'device-right';
  headlineY?: number;
  deviceY?: number;
  deviceX?: number;
}

export interface ScreenshotSetGenerationResult {
  slides: ScreenshotSlideSpec[];
  suggestedTheme: string;
  colorPalette: string[];
}

function framesForPlatform(platform: string): ScreenshotSlideSpec['frameType'][] {
  if (platform === 'android') {
    return ['android-pixel', 'android-slim', 'android-pixel', 'tilted-hand'];
  }
  if (platform === 'web' || platform === 'msstore') {
    return ['browser-window', 'macbook', 'ipad-pro', 'browser-window'];
  }
  return ['iphone-17-b', 'iphone-17-c', 'iphone-17-a', 'tilted-hand'];
}

const LAYOUTS: Array<NonNullable<ScreenshotSlideSpec['layout']>> = [
  'hero-center',
  'copy-top',
  'device-right',
  'device-left',
];

function layoutCoords(layout: NonNullable<ScreenshotSlideSpec['layout']>) {
  switch (layout) {
    case 'copy-top':
      return { headlineY: 16, deviceY: 62, deviceX: 50 };
    case 'device-left':
      return { headlineY: 22, deviceY: 58, deviceX: 38 };
    case 'device-right':
      return { headlineY: 22, deviceY: 58, deviceX: 62 };
    case 'hero-center':
    default:
      return { headlineY: 18, deviceY: 64, deviceX: 50 };
  }
}

export function generateScreenshotSetSpecs(params: {
  appName: string;
  appDescription?: string;
  targetPlatform: string;
  theme?: string;
  primaryColor?: string;
  auditFindingsSummary?: string[];
  rawImageCount?: number;
}): ScreenshotSetGenerationResult {
  const { appName, appDescription, targetPlatform, theme, primaryColor, auditFindingsSummary } =
    params;

  const mainColor = primaryColor || '#22d3ee';
  const isDark = theme === 'dark' || theme === 'glassmorphism' || !theme;
  const isMinimal = theme === 'minimal';
  const isGradient = theme === 'gradient';
  const frames = framesForPlatform(targetPlatform);
  const hasImages = (params.rawImageCount ?? 0) > 0;

  const copyBank = [
    {
      headline: appName,
      subhead: appDescription
        ? appDescription.slice(0, 90)
        : 'Fast, secure, and built for the way you work.',
      badgeText: 'New',
    },
    {
      headline: 'Trusted security',
      subhead:
        (auditFindingsSummary && auditFindingsSummary[0]) ||
        'Enterprise-grade protection with clear audit trails.',
      badgeText: 'Secure',
    },
    {
      headline: hasImages ? 'See it in action' : 'Real-time sync',
      subhead: hasImages
        ? 'Your product, framed for the store — ready to ship.'
        : 'Stay updated across every device — instantly.',
      badgeText: 'Fast',
    },
    {
      headline: 'Made for you',
      subhead: 'Customize controls, alerts, and workflows in minutes.',
      badgeText: 'Pro',
    },
  ];

  const slides: ScreenshotSlideSpec[] = copyBank.map((copy, i) => {
    const layout = LAYOUTS[i % LAYOUTS.length]!;
    const coords = layoutCoords(layout);
    const darkGradients = [
      `linear-gradient(160deg, #0b1220 0%, #132033 45%, ${mainColor}33 100%)`,
      'linear-gradient(160deg, #020617 0%, #0c1a3a 100%)',
      'linear-gradient(160deg, #090d16 0%, #064e3b 100%)',
      'linear-gradient(160deg, #111827 0%, #4c1d95 100%)',
    ];
    const lightGradients = [
      'linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)',
      `linear-gradient(160deg, #ffffff 0%, ${mainColor}22 100%)`,
      'linear-gradient(160deg, #f1f5f9 0%, #e0f2fe 100%)',
      'linear-gradient(160deg, #fafaf9 0%, #fef3c7 100%)',
    ];

    return {
      id: `slide-${i + 1}`,
      headline: copy.headline,
      subhead: copy.subhead,
      frameType: frames[i]!,
      backgroundColor: isMinimal ? '#f8fafc' : isDark ? '#0b1220' : '#ffffff',
      gradientBackground: isMinimal || (!isDark && !isGradient)
        ? lightGradients[i]!
        : darkGradients[i]!,
      textColor: isMinimal || (!isDark && theme === 'minimal') ? '#0f172a' : isDark || isGradient ? '#ffffff' : '#0f172a',
      badgeText: copy.badgeText,
      rawImageIndex: hasImages ? i % Math.max(1, params.rawImageCount ?? 1) : undefined,
      layout,
      ...coords,
    };
  });

  // Fix text color for dark slides
  for (const slide of slides) {
    if (slide.gradientBackground?.includes('#0') || slide.gradientBackground?.includes('#1')) {
      slide.textColor = '#ffffff';
    }
  }

  return {
    slides,
    suggestedTheme: theme || 'dark',
    colorPalette: [mainColor, '#6366f1', '#14b8a6', '#f59e0b'],
  };
}
