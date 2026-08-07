/** Store screenshot export sizes (px). */

export type StudioPlatform = 'ios' | 'android' | 'msstore' | 'web';

export const PLATFORM_EXPORT_SIZE: Record<
  StudioPlatform,
  { width: number; height: number; label: string }
> = {
  ios: { width: 1290, height: 2796, label: 'iPhone 6.7" (1290×2796)' },
  android: { width: 1080, height: 1920, label: 'Phone (1080×1920)' },
  msstore: { width: 1366, height: 768, label: 'Screenshot (1366×768)' },
  web: { width: 1366, height: 768, label: 'Web (1366×768)' },
};

/** Preview artboard CSS size matching a platform's export aspect ratio. */
export function previewArtboardSize(platform: StudioPlatform): {
  width: number;
  height: number;
} {
  const sized = PLATFORM_EXPORT_SIZE[platform];
  const width = 360;
  const height = Math.max(1, Math.round((width * sized.height) / sized.width));
  return { width, height };
}

/** Preview artboard size used in the editor (CSS px). Prefer previewArtboardSize(platform). */
export const PREVIEW_ARTBOARD = { width: 360, height: 680 };

export function fileToDataUrl(file: File, maxEdge = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        resolve(raw);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(raw);
        }
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

/** Ensure any blob: URLs in canvas are converted before persistence. */
export async function persistableScreens<T extends { elements: Array<{ imageUrl?: string }> }>(
  screens: T[],
): Promise<T[]> {
  const clone = structuredClone(screens);
  for (const screen of clone) {
    for (const el of screen.elements) {
      if (el.imageUrl?.startsWith('blob:')) {
        try {
          const res = await fetch(el.imageUrl);
          const blob = await res.blob();
          const file = new File([blob], 'screenshot.jpg', { type: blob.type || 'image/jpeg' });
          el.imageUrl = await fileToDataUrl(file);
        } catch {
          /* leave as-is */
        }
      }
    }
  }
  return clone;
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'studio-export';
}
