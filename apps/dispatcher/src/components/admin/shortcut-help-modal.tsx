'use client';

import { useUIStore } from '@/stores/ui-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCurrentPageShortcuts } from '@/hooks/use-page-shortcuts';

const GLOBAL_SHORTCUTS = [
  { key: '⌘K / Ctrl+K', description: 'Abrir paleta de comandos' },
  { key: '?',           description: 'Mostrar atajos de teclado' },
  { key: 'Esc',         description: 'Cerrar diálogo / modal' },
];

export function ShortcutHelpModal() {
  const isOpen = useUIStore((s) => s.isShortcutHelpOpen);
  const toggle = useUIStore((s) => s.toggleShortcutHelp);
  const pageShortcuts = getCurrentPageShortcuts();

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) toggle(); }}>
      <DialogContent className="sm:max-w-md bg-[var(--neutral-0)] border-[var(--neutral-200)]">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-2">
          {/* Global */}
          <ShortcutGroup title="Global" shortcuts={GLOBAL_SHORTCUTS} />
          {/* Page-specific */}
          {pageShortcuts && pageShortcuts.shortcuts.length > 0 && (
            <ShortcutGroup
              title={`Página: ${pageShortcuts.page}`}
              shortcuts={pageShortcuts.shortcuts.map((s) => ({ key: s.key, description: s.description }))}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutGroup({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: { key: string; description: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="space-y-1.5">
        {shortcuts.map(({ key, description }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--neutral-700)]">{description}</span>
            <kbd className="shrink-0 text-xs bg-[var(--neutral-100)] border border-[var(--neutral-200)] text-[var(--neutral-600)] px-2 py-0.5 rounded font-mono">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
