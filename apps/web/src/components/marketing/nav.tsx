'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/tarifas', label: 'Tarifas' },
  { href: '/conductores', label: 'Conductores' },
  { href: '/contacto', label: 'Contacto' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.getElementById('hero-sentinel');
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-[var(--neutral-0)]/90 backdrop-blur-md border-b border-[var(--neutral-200)] shadow-sm'
            : 'bg-transparent',
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className={cn(
              'font-[family-name:var(--font-inter-tight)] font-bold text-xl tracking-tight transition-colors',
              scrolled ? 'text-[var(--brand-primary)]' : 'text-white',
            )}
          >
            Remis
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:opacity-70',
                  scrolled ? 'text-[var(--neutral-700)]' : 'text-white/90',
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#descargar"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)] transition-colors"
            >
              <Download size={15} />
              Descargar app
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className={cn(
              'md:hidden p-2 rounded-[var(--radius-md)] transition-colors',
              scrolled
                ? 'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]'
                : 'text-white hover:bg-white/10',
            )}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 inset-x-0 bg-[var(--neutral-0)] rounded-t-2xl p-6 pb-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--neutral-300)] rounded-full mx-auto mb-6" />
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="py-3 px-2 text-[var(--neutral-800)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--neutral-100)] transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="#descargar"
                className="mt-4 flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] font-semibold bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <Download size={16} />
                Descargar app
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Sentinel div placed at the bottom of hero */}
      <div ref={sentinelRef} />
    </>
  );
}
