'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Drawer móvil premium — slide desde la izquierda, ~85% del ancho,
 * cierra al click afuera, Esc, swipe o botón. Sin dependencias externas.
 */
export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Body scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden={!open}
      className={cn(
        'fixed inset-0 z-[60] lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Cerrar menú"
        onClick={onClose}
        className={cn(
          'absolute inset-0 cursor-default bg-black/55 backdrop-blur-[3px]',
          'transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={cn(
          'absolute left-0 top-0 flex h-full flex-col',
          'bg-[var(--neutral-0)] shadow-[0_24px_56px_-12px_rgba(0,0,0,0.45)]',
          'border-r border-[var(--neutral-200)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          width: 'min(86vw, 340px)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Edge highlight — toque premium */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--neutral-200)] to-transparent"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
