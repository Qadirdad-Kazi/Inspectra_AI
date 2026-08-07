export class CreateScreenshotProjectDto {
  name!: string;
  assetId?: string;
  platform?: 'ios' | 'android' | 'msstore' | 'web';
  canvasConfig?: Record<string, unknown>;
  exportSettings?: Record<string, unknown>;
}
