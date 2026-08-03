/** Detect whether a pasted identifier is a website or app-store listing. */

export type AuditTargetKind = 'web' | 'android' | 'ios' | 'msstore';

export type DetectedTarget = {
  kind: AuditTargetKind;
  /** Normalized value to send to the API */
  value: string;
  label: string;
};

const PLAY =
  /(?:play\.google\.com\/store\/apps\/details\?[^\s]*id=|market:\/\/details\?id=)?([a-zA-Z][\w.]*\.[a-zA-Z][\w.]*)/;
const APPLE_ID = /(?:apps\.apple\.com\/[^\s]*\/id|itunes\.apple\.com\/[^\s]*\/id)?(\d{5,})/;
const MS =
  /(?:apps\.microsoft\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?detail\/|microsoft\.com\/[^\s]*\/p\/[^/]+\/|store\/productId\/)?([0-9a-z]{12})(?:\?|$|\/|&)/i;

export function detectAuditTarget(raw: string): DetectedTarget | null {
  const input = raw.trim();
  if (!input) return null;

  if (/play\.google\.com/i.test(input) || /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(input)) {
    const m = input.match(PLAY);
    const id = m?.[1] ?? (input.includes('.') && !input.includes('://') ? input : null);
    if (id && id.includes('.')) {
      return { kind: 'android', value: id, label: 'Google Play' };
    }
  }

  if (/apps\.apple\.com|itunes\.apple\.com/i.test(input) || /^\d{5,}$/.test(input)) {
    const m = input.match(APPLE_ID);
    if (m?.[1]) {
      return { kind: 'ios', value: m[1], label: 'App Store' };
    }
  }

  if (/apps\.microsoft\.com|microsoft\.com.*store|store\/productId/i.test(input) || /^[0-9A-Z]{12}$/i.test(input)) {
    const m = input.match(MS) || input.match(/detail\/([0-9a-z]{12})/i) || input.match(/^([0-9a-z]{12})$/i);
    if (m?.[1]) {
      return { kind: 'msstore', value: m[1].toUpperCase(), label: 'Microsoft Store' };
    }
  }

  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(withProto);
    if (url.hostname && !url.hostname.includes(' ')) {
      return { kind: 'web', value: url.toString(), label: 'Website' };
    }
  } catch {
    /* fall through */
  }

  return null;
}

const PENDING_KEY = 'inspectra_pending_target';

export function stashPendingTarget(target: DetectedTarget) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(target));
}

export function readPendingTarget(): DetectedTarget | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DetectedTarget;
  } catch {
    return null;
  }
}

export function clearPendingTarget() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_KEY);
}
