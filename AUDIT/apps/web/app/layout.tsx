import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from 'sonner';
import '../styles/globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Inspectra AI — Paste a link. Get a clear audit.',
  description:
    'Website and app-store audits with prioritized fixes, surface health, and team-ready exports.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plex.variable}>
      <body className={plex.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
