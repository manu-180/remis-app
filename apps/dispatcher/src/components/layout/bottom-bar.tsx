'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, MessageSquare, Bell, Clock, Wifi, WifiOff } from 'lucide-react';
import { subscribeToConnectionStatus } from '@/lib/supabase/realtime';
import { useUIStore } from '@/stores/ui-store';
import { useShortcutHelp } from '@/hooks/use-shortcut-help';
import { AlertsBar } from '@/components/alerts-bar';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string; Icon: typeof Wifi }
> = {
  connected:    { color: 'var(--success)', label: 'Conectado',   Icon: Wifi    },
  connecting:   { color: 'var(--warning)', label: 'Conectando…', Icon: Wifi    },
  disconnected: { color: 'var(--danger)',  label: 'Desconectado', Icon: WifiOff },
};

const SHORTCUTS_TABLE: [string, string][] = [
  ['Espacio',       'Nuevo pedido'],
  ['F1',            'Guardar form'],
  ['F2',            'Pickup (×2 → destino)'],
  ['F3',            'Teléfono'],
  ['F5',            'Toggle ahora/programado'],
  ['A',             'Asignar pedido seleccionado'],
  ['M',             'Designar manualmente'],
  ['E',             'Editar pedido'],
  ['C',             'Cancelar pedido'],
  ['H',             'Hold pedido'],
  ['R',             'Reasignar'],
  ['S / ⌘K',        'Buscar / Paleta'],
  ['F9',            'Mensaje al chofer'],
  ['Tab',           'Ciclar paneles →'],
  ['Shift+Tab',     'Ciclar paneles ←'],
  ['Esc',           'Cerrar modal/panel'],
  ['Ctrl+Z',        'Deshacer asignación (30s)'],
  ['1–9',           'Seleccionar sugerido N'],
  ['[ / ]',         'Navegar cola'],
  ['⌘1/2/3',        'Densidad'],
  ['⌘D',            'Toggle tema'],
  ['⌘L',            'Bloquear pantalla'],
  ['?',             'Esta ayuda'],
];

export function BottomBar() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const isHelpOpen = useShortcutHelp();
  const toggleHelp = useUIStore((s) => s.toggleShortcutHelp);

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus(setStatus);
    return unsubscribe;
  }, []);

  const { color, label, Icon } = STATUS_CONFIG[status]!;

  return (
    <>
      <AlertsBar />
      <footer
        className="col-span-3 flex items-center gap-4 px-4 border-t border-[var(--neutral-200)] bg-[var(--neutral-50)]"
        style={{ height: '44px' }}
        role="contentinfo"
      >
        <button
          className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
          aria-label="Mensajes con choferes"
        >
          <MessageSquare size={14} aria-hidden />
          Mensajes
        </button>

        <button
          className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
          aria-label="Alertas activas"
        >
          <Bell size={14} aria-hidden />
          Alertas
        </button>

        <button
          className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
          aria-label="Próximos programados"
        >
          <Clock size={14} aria-hidden />
          Próximos 30 min
        </button>

        <div className="flex-1" />

        <button
          onClick={toggleHelp}
          aria-label="Atajos de teclado (?)"
          aria-expanded={isHelpOpen}
          className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
        >
          <HelpCircle size={14} aria-hidden />
          <kbd>?</kbd>
        </button>

        <div
          className="flex items-center gap-1.5 text-[var(--text-xs)]"
          style={{ color }}
          aria-live="polite"
          aria-label={`Estado de conexión: ${label}`}
        >
          <Icon size={14} aria-hidden />
          {label}
        </div>
      </footer>

      {isHelpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Atajos de teclado"
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) toggleHelp(); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--neutral-200)]">
              <h2 className="font-semibold text-[var(--neutral-900)]">Atajos de teclado</h2>
              <button
                onClick={toggleHelp}
                aria-label="Cerrar"
                className="text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <table className="w-full text-[var(--text-sm)]">
                <tbody>
                  {SHORTCUTS_TABLE.map(([key, desc]) => (
                    <tr key={key} className="border-b border-[var(--neutral-200)] last:border-0">
                      <td className="py-2 pr-4">
                        <kbd className="font-[var(--font-family-mono)] text-[var(--text-xs)] bg-[var(--neutral-200)] px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--neutral-700)]">
                          {key}
                        </kbd>
                      </td>
                      <td className="py-2 text-[var(--neutral-600)]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
