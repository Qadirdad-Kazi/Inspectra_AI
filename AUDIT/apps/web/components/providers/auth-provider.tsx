'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  apiFetch,
  clearSession,
  getAccessToken,
  getActiveOrgId,
  setActiveOrgId,
  setSession,
  type SessionTokens,
} from '@/lib/api';

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  imageUrl?: string | null;
  isPlatformAdmin?: boolean;
  organizations: OrgSummary[];
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  activeOrgId: string | null;
  setOrg: (orgId: string) => void;
  refreshUser: () => Promise<void>;
  applySession: (tokens: SessionTokens) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<AuthUser>('/auth/me');
      setUser(me);
      const existing = getActiveOrgId();
      const nextOrg =
        (existing && me.organizations.some((o) => o.id === existing) && existing) ||
        me.organizations[0]?.id ||
        null;
      if (nextOrg) {
        setActiveOrgId(nextOrg);
        setActiveOrgIdState(nextOrg);
      }
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const applySession = useCallback(
    async (tokens: SessionTokens) => {
      setSession(tokens);
      setLoading(true);
      await refreshUser();
    },
    [refreshUser],
  );

  const signOut = useCallback(async () => {
    try {
      await apiFetch('/auth/signout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearSession();
    setUser(null);
    setActiveOrgIdState(null);
  }, []);

  const setOrg = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    setActiveOrgIdState(orgId);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      activeOrgId,
      setOrg,
      refreshUser,
      applySession,
      signOut,
    }),
    [user, loading, activeOrgId, setOrg, refreshUser, applySession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
