'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import clsx from 'clsx';
import AppDataHydrator from '@/components/AppDataHydrator';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth');

  return (
    <div className="min-h-screen bg-ink">
      <AppDataHydrator />
      <div className={clsx('mx-auto flex min-h-screen w-full max-w-6xl', isOnboarding ? 'flex-col' : 'flex-col pb-20')}>
        <main className="flex-1 px-5 pb-8 pt-8 md:px-8">{children}</main>
        {!isOnboarding && <BottomNav />}
      </div>
    </div>
  );
}
