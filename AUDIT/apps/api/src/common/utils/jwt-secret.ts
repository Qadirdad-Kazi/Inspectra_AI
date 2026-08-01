const DEV_FALLBACK = 'dev-inspectra-secret-change-me';

/**
 * Resolve JWT signing secret. Production refuses missing/weak defaults.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret === DEV_FALLBACK || secret.length < 32) {
      throw new Error(
        'AUTH_SECRET (or JWT_SECRET) must be set to a strong value (≥32 chars) in production',
      );
    }
    return secret;
  }

  return secret || DEV_FALLBACK;
}
