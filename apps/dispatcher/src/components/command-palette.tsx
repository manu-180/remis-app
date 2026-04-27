'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Plus, Users, List, BarChart2, Settings, LogOut } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useHotkeys } from 'react-hotkeys-hook';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function CommandPalette() {
  const isOpen     = useUIStore((s) => s.isCommandPaletteOpen);
  const close      = useUIStore((s) => s.closeCommandPalette);
  const open       = useUIStore((s) => s.openCommandPalette);
  const setDensity = useUIStore((s) => s.setDensity);

  useHotkeys('mod+k', (e) => { e.preventDefault(); isOpen ? close() : open(); });

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [close]);

  const handleSignOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = '/login';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-xl mx-4">
        <Command
          className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden"
          label="Paleta de comandos"
        >
          <div className="flex items-center gap-2 px-4 border-b border-[var(--neutral-200)]">
            <Search size={16} className="text-[var(--neutral-500)]" aria-hidden />
            <Command.Input
              placeholder="Buscar acción o pedido…"
              className="flex-1 h-12 bg-transparent text-[var(--neutral-800)] placeholder:text-[var(--neutral-400)] text-[var(--text-sm)] focus:outline-none"
              autoFocus
            />
            <kbd className="text-[var(--text-xs)] text-[var(--neutral-500)] border border-[var(--neutral-300)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
              Esc
            </kbd>
          </div>

          <Command.List className="overflow-y-auto max-h-[360px] p-2">
            <Command.Empty className="py-6 text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
              Sin resultados
            </Command.Empty>

            <Command.Group
              heading="Acciones"
              className="text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest px-2 py-1"
            >
              <CommandItem icon={Plus}   label="Nuevo pedido"    shortcut="Espacio" onSelect={() => { document.getElementById('field-phone')?.focus(); close(); }} />
              <CommandItem icon={Users}  label="Asignar chofer"  shortcut="A"       onSelect={close} />
              <CommandItem icon={List}   label="Buscar pasajero" shortcut="S"       onSelect={close} />
              <CommandItem icon={Search} label="Buscar viaje #"  shortcut=""        onSelect={close} />
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--neutral-200)] my-1" />

            <Command.Group
              heading="Densidad"
              className="text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest px-2 py-1"
            >
              {(['comfortable', 'compact', 'dense'] as const).map((d, i) => (
                <Command.Item
                  key={d}
                  value={d}
                  onSelect={() => { setDensity(d); close(); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] text-[var(--neutral-700)] cursor-pointer data-[selected=true]:bg-[var(--neutral-200)]"
                >
                  <BarChart2 size={16} className="text-[var(--neutral-500)]" aria-hidden />
                  <span className="flex-1">
                    {d === 'comfortable' ? 'Cómodo' : d === 'compact' ? 'Compacto' : 'Denso'}
                  </span>
                  <kbd className="text-[var(--text-xs)] opacity-60">⌘{i + 1}</kbd>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--neutral-200)] my-1" />

            <Command.Group heading="Sesión">
              <CommandItem icon={Settings} label="Configuración" shortcut="" onSelect={close} />
              <CommandItem icon={LogOut}   label="Cerrar sesión" shortcut="" onSelect={handleSignOut} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  shortcut: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] text-[var(--neutral-700)] cursor-pointer data-[selected=true]:bg-[var(--neutral-200)]"
    >
      <Icon size={16} className="text-[var(--neutral-500)]" aria-hidden />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[var(--text-xs)] opacity-60">{shortcut}</kbd>
      )}
    </Command.Item>
  );
}
