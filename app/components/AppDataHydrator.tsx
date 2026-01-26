'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/components/AuthProvider';

export default function AppDataHydrator() {
  const { status } = useAuth();
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    if (status === 'authenticated' && !hydrated) {
      hydrate();
    }
  }, [status, hydrated, hydrate]);

  return null;
}
