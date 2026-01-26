'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signIn: (payload: { email: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    initialUser ? 'authenticated' : 'loading'
  );

  const refresh = useCallback(async () => {
    setStatus('loading');
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }
    const data = await response.json();
    setUser(data.user ?? null);
    setStatus(data.user ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    if (!initialUser) {
      refresh();
    }
  }, [initialUser, refresh]);

  const signIn = useCallback(async ({ email, name }: { email: string; name?: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    if (!response.ok) {
      throw new Error('Unable to sign in.');
    }
    const data = await response.json();
    setUser(data.user ?? null);
    setStatus(data.user ? 'authenticated' : 'unauthenticated');
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      signIn,
      signOut,
      refresh,
    }),
    [user, status, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
