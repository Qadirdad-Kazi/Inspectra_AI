export class AiGenerateScreenshotsDto {
  appName!: string;
  appDescription?: string;
  targetPlatform!: 'ios' | 'android' | 'msstore' | 'web';
  theme?: 'dark' | 'glassmorphism' | 'gradient' | 'minimal';
  primaryColor?: string;
  rawScreenshotUrls?: string[];
  auditFindingsSummary?: string[];
}
