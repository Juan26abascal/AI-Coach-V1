import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import AuthProvider from '@/components/AuthProvider';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'AI Running Coach',
  description: 'Premium AI Running Coach MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-stone font-sans">
        <AuthProvider initialUser={user}>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
