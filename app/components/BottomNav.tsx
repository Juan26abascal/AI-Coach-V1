'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Chat' },
  { href: '/plan', label: 'Plan' },
  { href: '/log', label: 'Log' },
  { href: '/profile', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-smoke/70 bg-ink/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'text-xs uppercase tracking-[0.2em] transition focus-ring',
                active ? 'text-sand' : 'text-stone/50 hover:text-stone'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
