'use client';

import { useState, useEffect } from 'react';
import { Sidebar, MobileSidebar } from './sidebar';
import { TopBar } from './top-bar';
import { PageTransition } from './page-transition';
import { CommandPalette } from './command-palette';
import { ShortcutHelpModal } from './shortcut-help-modal';
import { ConfirmDialogProvider } from './confirm-dialog';
import { Drawer } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useSosWatcher } from '@/hooks/use-sos-watcher';
import type { Database } from '@remis/shared-types/database';

type Role = Database['public']['Enums']['user_role'];

interface AdminShellProps {
  profile: {
    id: string;
    role: Role;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  children: React.ReactNode;
}

export function AdminShell({ profile, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Global SOS watcher — alarm + notifications + badge count
  useSosWatcher();

  // Leer estado colapsado de localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('admin:sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  // Forzar density comfortable en admin; restaurar al salir
  useEffect(() => {
    const prev = document.documentElement.dataset.density ?? 'dense';
    document.documentElement.dataset.density = 'comfortable';
    return () => {
      document.documentElement.dataset.density = prev;
    };
  }, []);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin:sidebar-collapsed', String(next));
  };

  return (
    <div className="min-h-screen bg-[var(--neutral-50)]" data-density="comfortable">

      {/* Sidebar desktop — fixed left */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen z-20">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      </aside>

      {/* Sidebar mobile — Drawer desde la izquierda */}
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        width="sm"
        side="left"
      >
        <MobileSidebar
          collapsed={false}
          onToggle={() => setMobileOpen(false)}
          mobile
          onClose={() => setMobileOpen(false)}
        />
      </Drawer>

      {/* Main content */}
      <div
        className={cn(
          'flex flex-col min-h-screen',
          'transition-[margin-left] duration-200 ease-[var(--ease-emphasized)]',
          // Sólo aplica margin en desktop (lg+), y sólo una vez montado para evitar flash
          mounted
            ? collapsed ? 'lg:ml-[72px]' : 'lg:ml-[264px]'
            : 'lg:ml-[264px]'
        )}
      >
        <TopBar
          profile={profile}
          collapsed={collapsed}
          onMenuClick={() => setMobileOpen(true)}
          onSearch={() => setCommandOpen(true)}
        />

        <main id="main-content" className="flex-1">
          <ConfirmDialogProvider>
            <PageTransition>{children}</PageTransition>
          </ConfirmDialogProvider>
        </main>
      </div>

      {/* Command palette global */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Shortcut help modal */}
      <ShortcutHelpModal />
    </div>
  );
}
