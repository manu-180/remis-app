'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Settings, User, Map, Lock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { DRIVER_STATUS_COLORS } from '@/lib/mock/drivers';
import { useOnlineDrivers, useAvailableDrivers, useDriversStore } from '@/stores/drivers-store';
import { useActiveRides, useQueuedRides } from '@/stores/rides-store';
import { useDailyStats, formatDuration } from '@/hooks/use-daily-stats';

export function TopBar() {
  const [time, setTime] = useState('');
  const [showStats, setShowStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const { theme, setTheme, density, setDensity } = useUIStore();

  const availableDrivers  = useAvailableDrivers();
  const onlineDrivers     = useOnlineDrivers();
  const activeRides       = useActiveRides();
  const queuedRides       = useQueuedRides();
  const { stats, loading: statsLoading } = useDailyStats();

  const enRouteCount     = onlineDrivers.filter((d) => d.status === 'en_route_to_pickup').length;
  const waitingCount     = onlineDrivers.filter((d) => d.status === 'waiting_passenger').length;
  const onTripCount      = onlineDrivers.filter((d) => d.status === 'on_trip').length;
  const allDrivers       = Array.from(useDriversStore.getState().drivers.values());
  const offlineCount     = allDrivers.filter((d) => d.status === 'offline').length;

  const kpis = [
    { label: 'lib',   count: availableDrivers.length, statusKey: 'available'           as const },
    { label: 'yendo', count: enRouteCount,             statusKey: 'en_route_to_pickup'  as const },
    { label: 'esp',   count: waitingCount,             statusKey: 'waiting_passenger'   as const },
    { label: 'ocup',  count: onTripCount,              statusKey: 'on_trip'             as const },
    { label: 'off',   count: offlineCount,             statusKey: 'offline'             as const },
  ];

  useEffect(() => {
    const tick = () => setTime(format(new Date(), 'HH:mm', { locale: es }));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!showStats) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowStats(false); };
    const handleClick = (e: MouseEvent) => {
      if (statsRef.current && !statsRef.current.contains(e.target as Node)) setShowStats(false);
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [showStats]);

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
        {kpis.map((kpi) => (
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

      <div className="relative" ref={statsRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStats((v) => !v)}
          aria-label="Estadísticas del día"
          aria-expanded={showStats}
          className="gap-1.5 text-[var(--neutral-500)]"
        >
          <TrendingUp size={16} aria-hidden />
          <span className="text-[var(--text-xs)]">Hoy</span>
        </Button>

        {showStats && (
          <div
            role="dialog"
            aria-label="Estadísticas del día"
            className="absolute right-0 top-full mt-1 w-64 bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] z-50 py-3 px-4"
          >
            {statsLoading || !stats ? (
              <p className="text-[var(--text-xs)] text-[var(--neutral-500)] text-center py-2">Cargando…</p>
            ) : (
              <div className="flex flex-col gap-2 text-[var(--text-xs)]">
                <div className="flex justify-between">
                  <span className="text-[var(--neutral-500)]">Viajes</span>
                  <span className="text-[var(--neutral-800)] font-medium">
                    {stats.ridesCompleted} hechos / {stats.ridesCancelled} cancelados
                  </span>
                </div>
                <div className="h-px bg-[var(--neutral-200)]" />
                <div className="flex justify-between">
                  <span className="text-[var(--neutral-500)]">Efectivo</span>
                  <span className="text-[var(--neutral-800)] font-medium">
                    ${stats.revenueEfectivo.toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--neutral-500)]">MercadoPago</span>
                  <span className="text-[var(--neutral-800)] font-medium">
                    ${stats.revenueMercadopago.toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="h-px bg-[var(--neutral-200)]" />
                <div className="flex justify-between">
                  <span className="text-[var(--neutral-500)]">Choferes activos</span>
                  <span className="text-[var(--neutral-800)] font-medium">
                    {onlineDrivers.length} / {allDrivers.length}
                  </span>
                </div>
                {stats.avgAssignmentSeconds != null && (
                  <div className="flex justify-between">
                    <span className="text-[var(--neutral-500)]">Prom. asignación</span>
                    <span className="text-[var(--neutral-800)] font-medium">
                      {formatDuration(stats.avgAssignmentSeconds)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open('/dispatch/map-fullscreen', 'dispatch-map', 'width=1920,height=1080')}
        aria-label="Abrir ventana mapa"
        className="text-[var(--neutral-500)]"
      >
        <Map size={16} aria-hidden />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => useUIStore.getState().lock()}
        aria-label="Bloquear pantalla (⌘L)"
        className="text-[var(--neutral-500)]"
      >
        <Lock size={16} aria-hidden />
      </Button>

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
