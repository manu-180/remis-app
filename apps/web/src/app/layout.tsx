import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Remis — Tu remís en la pampa',
    template: '%s | Remis',
  },
  description:
    'Pedí tu remís desde la app o llamando. Conductores conocidos, tarifas de ordenanza municipal. Servicio de remisería local en La Pampa.',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Remis',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  metadataBase: new URL('https://remis.com.ar'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--neutral-0)] text-[var(--neutral-900)]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
