/** Production frontend (Vercel). Always allowlisted when NODE_ENV=production. */
export const DEFAULT_PROD_WEB_ORIGIN = 'https://inspectra-tan.vercel.app';

function isLocalhostOrigin(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value);
  }
}

/**
 * Parse WEB_URL (comma-separated) into CORS / OAuth allowlist origins.
 * In production, localhost-only WEB_URL is replaced and the Vercel origin is always included.
 */
export function resolveWebOrigins(
  raw = process.env.WEB_URL,
  isProd = process.env.NODE_ENV === 'production',
): string[] {
  const fallback = isProd ? DEFAULT_PROD_WEB_ORIGIN : 'http://localhost:3000';
  let source = raw?.trim() || fallback;

  if (isProd) {
    const parts = source.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0 || parts.every(isLocalhostOrigin)) {
      source = fallback;
    }
  }

  const origins = source
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (isProd && !origins.includes(DEFAULT_PROD_WEB_ORIGIN)) {
    origins.push(DEFAULT_PROD_WEB_ORIGIN);
  }

  return origins.length > 0 ? origins : [fallback];
}
