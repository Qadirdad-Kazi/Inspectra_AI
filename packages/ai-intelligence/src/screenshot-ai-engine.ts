export interface ScreenshotSlideSpec {
  id: string;
  headline: string;
  subhead: string;
  frameType: 'iphone-16-pro' | 'ipad-pro' | 'pixel-9' | 'browser-window';
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

export function generateScreenshotSetSpecs(params: {
  appName: string;
  appDescription?: string;
  targetPlatform: string;
  theme?: string;
  primaryColor?: string;
  auditFindingsSummary?: string[];
  rawImageCount?: number;
}): ScreenshotSetGenerationResult {
  const { appName, appDescription, targetPlatform, theme, primaryColor, auditFindingsSummary } = params;

  const mainColor = primaryColor || '#3b82f6';
  const isDark = theme === 'dark' || theme === 'glassmorphism' || !theme;

  const slides: ScreenshotSlideSpec[] = [
    {
      id: 'slide-1',
      headline: `${appName} — Next-Gen Experience`,
      subhead: appDescription ? appDescription.slice(0, 70) : 'Fast, secure, and built for performance.',
      frameType: targetPlatform === 'ios' ? 'iphone-16-pro' : 'pixel-9',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      gradientBackground: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      textColor: '#ffffff',
      badgeText: 'Featured',
      rawImageIndex: 0,
    },
    {
      id: 'slide-2',
      headline: 'Audited & Verified Security',
      subhead:
        (auditFindingsSummary && auditFindingsSummary[0]) ||
        'Enterprise-grade protection with full encryption.',
      frameType: targetPlatform === 'ios' ? 'iphone-16-pro' : 'pixel-9',
      backgroundColor: isDark ? '#020617' : '#f8fafc',
      gradientBackground: 'linear-gradient(135deg, #020617 0%, #172554 100%)',
      textColor: '#ffffff',
      badgeText: '100% Compliant',
      rawImageIndex: 1,
    },
    {
      id: 'slide-3',
      headline: 'Seamless Real-Time Sync',
      subhead: 'Instant updates across all your devices anywhere, anytime.',
      frameType: targetPlatform === 'ios' ? 'iphone-16-pro' : 'pixel-9',
      backgroundColor: isDark ? '#090d16' : '#f1f5f9',
      gradientBackground: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
      textColor: '#ffffff',
      badgeText: 'Lightning Fast',
      rawImageIndex: 2,
    },
    {
      id: 'slide-4',
      headline: 'Advanced Customization',
      subhead: 'Tailor controls, notifications, and settings to match your workflow.',
      frameType: targetPlatform === 'ios' ? 'iphone-16-pro' : 'pixel-9',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      gradientBackground: 'linear-gradient(135deg, #111827 0%, #4c1d95 100%)',
      textColor: '#ffffff',
      badgeText: 'Pro Features',
      rawImageIndex: 3,
    },
  ];

  return {
    slides,
    suggestedTheme: theme || 'dark',
    colorPalette: [mainColor, '#6366f1', '#14b8a6', '#f59e0b'],
  };
}
