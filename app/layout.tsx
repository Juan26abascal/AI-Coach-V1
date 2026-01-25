import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'AI Running Coach',
  description: 'Premium AI Running Coach MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-stone font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
