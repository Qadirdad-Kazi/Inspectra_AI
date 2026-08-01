'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { API_URL, type SessionTokens } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { applySession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const error = params.get('error');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sign in failed');
      await applySession(data.tokens as SessionTokens);
      toast.success('Welcome back');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Email/password or continue with OAuth.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">
            OAuth sign-in failed. Check provider credentials.
          </p>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a href={`${API_URL}/v1/auth/oauth/google`}>Google</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`${API_URL}/v1/auth/oauth/github`}>GitHub</a>
          </Button>
        </div>
        <p className="text-center text-sm text-muted">
          No account?{' '}
          <Link className="text-primary underline" href="/sign-up">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
