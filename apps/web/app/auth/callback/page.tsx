'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

function CallbackInner() {
  const router = useRouter();
  const { applySession } = useAuth();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const params = new URLSearchParams(hash);
    // Legacy query support during rollout
    const query = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const accessToken = params.get('accessToken') || query.get('accessToken');
    const refreshToken = params.get('refreshToken') || query.get('refreshToken');
    if (!accessToken || !refreshToken) {
      router.replace('/sign-in?error=oauth_failed');
      return;
    }
    // Clear tokens from the address bar ASAP
    window.history.replaceState(null, '', '/auth/callback');
    void applySession({ accessToken, refreshToken, expiresIn: 3600 }).then(() => {
      router.replace('/dashboard');
    });
  }, [applySession, router]);

  return <div className="grid min-h-screen place-items-center text-muted">Completing sign-in…</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center">Loading…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
