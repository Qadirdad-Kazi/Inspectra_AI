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
  const frames = framesForPlatform(targetPlatform);

  const slides: ScreenshotSlideSpec[] = [
    {
      id: 'slide-1',
      headline: `${appName}`,
      subhead: appDescription
        ? appDescription.slice(0, 90)
        : 'Fast, secure, and built for the way you work.',
      frameType: frames[0]!,
      backgroundColor: isMinimal ? '#f8fafc' : isDark ? '#0b1220' : '#ffffff',
      gradientBackground: isMinimal
        ? 'linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)'
        : 'linear-gradient(160deg, #0b1220 0%, #132033 50%, #1a2740 100%)',
      textColor: isMinimal ? '#0f172a' : '#ffffff',
      badgeText: 'New',
      rawImageIndex: 0,
    },
    {
      id: 'slide-2',
      headline: 'Trusted security',
      subhead:
        (auditFindingsSummary && auditFindingsSummary[0]) ||
        'Enterprise-grade protection with clear audit trails.',
      frameType: frames[1]!,
      backgroundColor: isDark ? '#020617' : '#f8fafc',
      gradientBackground: 'linear-gradient(160deg, #020617 0%, #0c1a3a 100%)',
      textColor: '#ffffff',
      badgeText: 'Secure',
      rawImageIndex: 1,
    },
    {
      id: 'slide-3',
      headline: 'Real-time sync',
      subhead: 'Stay updated across every device — instantly.',
      frameType: frames[2]!,
      backgroundColor: isDark ? '#090d16' : '#f1f5f9',
      gradientBackground: 'linear-gradient(160deg, #090d16 0%, #064e3b 100%)',
      textColor: '#ffffff',
      badgeText: 'Fast',
      rawImageIndex: 2,
    },
    {
      id: 'slide-4',
      headline: 'Made for you',
      subhead: 'Customize controls, alerts, and workflows in minutes.',
      frameType: frames[3]!,
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      gradientBackground: 'linear-gradient(160deg, #111827 0%, #4c1d95 100%)',
      textColor: '#ffffff',
      badgeText: 'Pro',
      rawImageIndex: 3,
    },
  ];

  return {
    slides,
    suggestedTheme: theme || 'dark',
    colorPalette: [mainColor, '#6366f1', '#14b8a6', '#f59e0b'],
  };
}
