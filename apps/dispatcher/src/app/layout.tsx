// apps/dispatcher/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Inter_Tight, Geist_Mono } from 'next/font/google';
import { PHProvider } from '@/components/providers/posthog-provider';
import { PostHogPageView } from '@/components/posthog-page-view';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-family-body',
  display: 'swap',
});
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-family-display',
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-family-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Panel de despacho — Remisería',
  description: 'Panel de gestión y despacho',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      data-density="dense"
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${interTight.variable} ${geistMono.variable}`}
      >
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <PHProvider>
          <PostHogPageView />
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
