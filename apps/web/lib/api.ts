export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const ACCESS_KEY = 'inspectra_access';
const REFRESH_KEY = 'inspectra_refresh';
const ORG_KEY = 'inspectra_org';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setSession(tokens: SessionTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getActiveOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ORG_KEY);
}

export function setActiveOrgId(orgId: string) {
  localStorage.setItem(ORG_KEY, orgId);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { orgId?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const orgId = options.orgId ?? getActiveOrgId();
  if (orgId) headers.set('x-organization-id', orgId);

  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      const retry = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
      if (!retry.ok) throw await toError(retry);
      return retry.json() as Promise<T>;
    }
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Authenticated binary/text download (reports). */
export async function apiDownload(
  path: string,
  options: { orgId?: string; filename?: string } = {},
): Promise<void> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const orgId = options.orgId ?? getActiveOrgId();
  if (orgId) headers.set('x-organization-id', orgId);

  const res = await fetch(`${API_URL}/v1${path}`, { headers });
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  const match = cd?.match(/filename="([^"]+)"/);
  const filename = options.filename || match?.[1] || 'download';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearSession();
    return false;
  }
  const data = (await res.json()) as { tokens: SessionTokens };
  setSession(data.tokens);
  return true;
}

async function toError(res: Response) {
  let body: { message?: string; code?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return new Error(body.message || `Request failed (${res.status})`);
}
