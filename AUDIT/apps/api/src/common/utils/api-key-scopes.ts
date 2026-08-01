import type { Role } from '../constants';

/**
 * Map API key scopes to an effective org role.
 * Defaults created as audits:read/reports:read → viewer.
 * Any *:write / audits:run → analyst; admin/* → admin.
 */
export function roleFromApiKeyScopes(scopes: string[]): Role {
  const set = new Set(scopes.map((s) => s.toLowerCase()));
  if (set.has('*') || set.has('admin') || set.has('org:admin') || set.has('*:admin')) {
    return 'admin';
  }
  for (const s of set) {
    if (s.endsWith(':write') || s === 'audits:run' || s === 'audits:write') {
      return 'analyst';
    }
  }
  return 'viewer';
}

/** True if key scopes include at least one of the required scope strings (or `*`). */
export function apiKeyHasScopes(granted: string[] | undefined, required: string[]): boolean {
  if (!required.length) return true;
  if (!granted?.length) return false;
  const set = new Set(granted.map((s) => s.toLowerCase()));
  if (set.has('*')) return true;
  return required.every((r) => set.has(r.toLowerCase()));
}
