'use client';

import { useEffect, useState } from 'react';
import { Search, Settings, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { DRIVER_STATUS_COLORS } from '@/lib/mock/drivers';

interface KPI {
  label: string;
  count: number;
  statusKey: keyof typeof DRIVER_STATUS_COLORS;
}

const MOCK_KPIS: KPI[] = [
  { label: 'lib', count: 12, statusKey: 'available' },
  { label: 'yendo', count: 5,  statusKey: 'en_route_to_pickup' },
  { label: 'esp', count: 3,  statusKey: 'waiting_passenger' },
  { label: 'ocup', count: 8,  statusKey: 'on_trip' },
  { label: 'off', count: 4,  statusKey: 'offline' },
];

export function TopBar() {
  const [time, setTime] = useState('');
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const { theme, setTheme, density, setDensity } = useUIStore();

  useEffect(() => {
    const tick = () => setTime(format(new Date(), 'HH:mm', { locale: es }));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="col-span-3 flex items-center gap-4 px-4 border-b border-[var(--neutral-200)] bg-[var(--neutral-50)] h-14"
      role="banner"
    >
      <span className="font-[var(--font-family-display)] font-bold text-[var(--text-md)] text-[var(--neutral-900)] shrink-0 tracking-tight">
        RemisDespacho
      </span>

      <div className="w-px h-5 bg-[var(--neutral-200)]" aria-hidden />

      <nav aria-label="KPIs de conductores" className="flex items-center gap-2">
        {MOCK_KPIS.map((kpi) => (
          <Badge
            key={kpi.statusKey}
            dot={DRIVER_STATUS_COLORS[kpi.statusKey]}
            className="bg-[var(--neutral-100)] text-[var(--neutral-700)] font-[var(--font-family-mono)]"
            aria-label={`${kpi.count} conductores ${kpi.label}`}
          >
            {kpi.count} {kpi.label}
          </Badge>
        ))}
      </nav>

      <div className="flex-1" />

      <time
        dateTime={new Date().toISOString()}
        className="font-[var(--font-family-mono)] text-[var(--text-sm)] text-[var(--neutral-600)] tabular-nums"
        aria-label={`Hora actual: ${time}`}
      >
        {time}
      </time>

      <Button
        variant="ghost"
        size="sm"
        onClick={openCommandPalette}
        aria-label="Abrir búsqueda (Ctrl+K)"
        className="gap-2 text-[var(--neutral-500)]"
      >
        <Search size={16} aria-hidden />
        <kbd className="text-[var(--text-xs)] px-1 rounded bg-[var(--neutral-200)] text-[var(--neutral-600)]">
          ⌘K
        </kbd>
      </Button>

      <div className="relative group">
        <Button variant="ghost" size="sm" aria-label="Configuración" aria-haspopup="menu">
          <Settings size={16} aria-hidden />
        </Button>
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 hidden group-focus-within:flex flex-col min-w-40 bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] z-50 py-1"
        >
          <p className="px-3 py-1 text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest">
            Tema
          </p>
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              role="menuitem"
              onClick={() => setTheme(t)}
              className="px-3 py-1.5 text-left text-[var(--text-sm)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
            >
              {t === 'dark' ? '🌙 Oscuro' : '☀️ Claro'} {theme === t && '✓'}
            </button>
          ))}
          <div className="h-px bg-[var(--neutral-200)] my-1" />
          <p className="px-3 py-1 text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest">
            Densidad
          </p>
          {(['comfortable', 'compact', 'dense'] as const).map((d, i) => (
            <button
              key={d}
              role="menuitem"
              onClick={() => setDensity(d)}
              className="px-3 py-1.5 text-left text-[var(--text-sm)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
            >
              <kbd className="text-[var(--text-xs)] mr-1 opacity-60">⌘{i + 1}</kbd>
              {d === 'comfortable' ? 'Cómodo' : d === 'compact' ? 'Compacto' : 'Denso'}{' '}
              {density === d && '✓'}
            </button>
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" aria-label="Perfil">
        <User size={16} aria-hidden />
      </Button>
    </header>
  );
}
