'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';
import { useAuth } from '@/components/AuthProvider';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, status } = useAuth();
  const [form, setForm] = useState({ email: '', name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(searchParams.get('callbackUrl') ?? '/');
    }
  }, [status, user, router, searchParams]);

  const handleSubmit = async () => {
    setError('');
    try {
      await signIn({ email: form.email, name: form.name });
      router.replace(searchParams.get('callbackUrl') ?? '/');
    } catch (err) {
      setError('Sign in failed. Please check your email.');
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-stone/40">AI Running Coach</p>
        <h1 className="text-2xl text-stone">Sign in to continue</h1>
        <p className="text-sm text-stone/60">Your training data will sync across devices.</p>
      </header>

      <Card className="space-y-4">
        <Input
          label="Email"
          placeholder="you@example.com"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          label="Name"
          placeholder="Alex Runner"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        {error && <p className="text-sm text-gold">{error}</p>}
        <Button onClick={handleSubmit} disabled={!form.email.trim()}>
          Continue
        </Button>
      </Card>
    </div>
  );
}
