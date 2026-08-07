export class UpdateScreenshotProjectDto {
  name?: string;
  platform?: 'ios' | 'android' | 'msstore' | 'web';
  canvasConfig?: Record<string, unknown>;
  exportSettings?: Record<string, unknown>;
}
