'use client';

import { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DRIVER_STATUS_COLORS, DRIVER_STATUS_LABELS } from '@/lib/mock/drivers';
import {
  useOnlineDrivers,
  useDriversStore,
  type Driver,
} from '@/stores/drivers-store';
import {
  useActiveRides,
  useRidesStore,
  type Ride,
} from '@/stores/rides-store';
import { useUIStore } from '@/stores/ui-store';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'drivers' | 'rides';
type SortMode = 'fifo' | 'number';
type RideFilter = 'all' | 'unassigned' | 'assigned' | 'in_progress';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatRequestedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function getDriverStatusLine(driver: Driver): string {
  switch (driver.status) {
    case 'available':
      return driver.timeClearSince
        ? `Libre desde ${formatTime(driver.timeClearSince)}`
        : 'Libre';
    case 'on_trip':
      return driver.currentRideId ? `En viaje #${driver.currentRideId}` : 'En viaje';
    case 'en_route_to_pickup':
      return 'Yendo a pickup';
    case 'waiting_passenger':
      return 'Esperando pasajero';
    case 'on_break':
      return 'Descanso';
    default:
      return DRIVER_STATUS_LABELS[driver.status] ?? driver.status;
  }
}

const RIDE_STATUS_BORDER: Record<Ride['status'], string> = {
  requested: 'var(--warning)',
  assigned: 'var(--info)',
  en_route_to_pickup: 'var(--info)',
  waiting_passenger: 'var(--warning)',
  on_trip: 'var(--danger)',
  completed: 'var(--success)',
  cancelled_by_passenger: 'var(--neutral-400)',
  cancelled_by_driver: 'var(--neutral-400)',
  cancelled_by_dispatcher: 'var(--neutral-400)',
  no_show: 'var(--neutral-400)',
};

// ─── Driver row (used inside virtualizer) ────────────────────────────────────

interface DriverRowProps {
  driver: Driver;
  rowHeight: number;
  isSelected: boolean;
  onClick: () => void;
}

function DriverRow({ driver, rowHeight, isSelected, onClick }: DriverRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={`flex items-center gap-3 cursor-pointer transition-colors px-3 ${
        isSelected
          ? 'bg-[var(--neutral-200)]'
          : 'hover:bg-[var(--neutral-100)]'
      }`}
      style={{ height: rowHeight }}
      aria-selected={isSelected}
    >
      {/* Status dot */}
      <span
        className="size-2.5 rounded-full shrink-0"
        style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
        aria-label={`Estado: ${DRIVER_STATUS_LABELS[driver.status]}`}
      />

      {/* Internal number */}
      <span className="font-mono text-[var(--text-xs)] text-[var(--neutral-500)] shrink-0 w-6 text-right">
        {driver.internalNumber}
      </span>

      {/* Name + status line */}
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-sm)] text-[var(--neutral-800)] truncate font-medium leading-tight">
          {driver.name}
        </p>
        <p className="text-[var(--text-xs)] text-[var(--neutral-500)] truncate leading-tight">
          {getDriverStatusLine(driver)}
        </p>
      </div>
    </div>
  );
}

// ─── Drivers panel ───────────────────────────────────────────────────────────

function DriversPanel({ rowHeight }: { rowHeight: number }) {
  const [sortMode, setSortMode] = useState<SortMode>('fifo');
  const onlineDrivers = useOnlineDrivers();
  const selectedDriverId = useDriversStore((s) => s.selectedDriverId);

  const sorted = useMemo<Driver[]>(() => {
    if (sortMode === 'number') {
      return [...onlineDrivers].sort((a, b) =>
        a.internalNumber.localeCompare(b.internalNumber, undefined, { numeric: true }),
      );
    }
    // FIFO: available first by timeClearSince asc, then others by lastSeen desc
    const available = onlineDrivers
      .filter((d) => d.status === 'available')
      .sort((a, b) => {
        const ta = a.timeClearSince ?? a.lastSeen ?? '';
        const tb = b.timeClearSince ?? b.lastSeen ?? '';
        return ta.localeCompare(tb);
      });
    const others = onlineDrivers
      .filter((d) => d.status !== 'available')
      .sort((a, b) => {
        const ta = a.lastSeen ?? '';
        const tb = b.lastSeen ?? '';
        return tb.localeCompare(ta); // desc
      });
    return [...available, ...others];
  }, [onlineDrivers, sortMode]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sort controls */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-[var(--neutral-200)] shrink-0">
        {(['fifo', 'number'] as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-2 py-0.5 rounded text-[var(--text-xs)] font-medium transition-colors ${
              sortMode === mode
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]'
            }`}
          >
            {mode === 'fifo' ? 'FIFO' : 'Nro'}
          </button>
        ))}
      </div>

      {/* Virtualized list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[var(--neutral-500)]">
          <p className="text-[var(--text-sm)]">Sin choferes online</p>
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-y-auto">
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const driver = sorted[vItem.index]!;
              return (
                <div
                  key={driver.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  <DriverRow
                    driver={driver}
                    rowHeight={rowHeight}
                    isSelected={selectedDriverId === driver.id}
                    onClick={() =>
                      useDriversStore.getState().selectDriver(driver.id)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rides panel ─────────────────────────────────────────────────────────────

function RidesPanel() {
  const [filter, setFilter] = useState<RideFilter>('all');
  const allActive = useActiveRides();
  const selectedRideId = useRidesStore((s) => s.selectedRideId);

  const IN_PROGRESS = new Set<Ride['status']>([
    'en_route_to_pickup',
    'waiting_passenger',
    'on_trip',
  ]);

  const rides = useMemo<Ride[]>(() => {
    switch (filter) {
      case 'unassigned':
        return allActive.filter((r) => r.status === 'requested');
      case 'assigned':
        return allActive.filter((r) => r.status === 'assigned');
      case 'in_progress':
        return allActive.filter((r) => IN_PROGRESS.has(r.status));
      default:
        return allActive;
    }
  }, [allActive, filter]);

  const FILTER_LABELS: Record<RideFilter, string> = {
    all: 'Todos',
    unassigned: 'Sin asignar',
    assigned: 'Asignados',
    in_progress: 'En curso',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter chips */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-[var(--neutral-200)] shrink-0 flex-wrap">
        {(Object.keys(FILTER_LABELS) as RideFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-[var(--text-xs)] font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* List */}
      {rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[var(--neutral-500)]">
          <p className="text-[var(--text-sm)]">Sin pedidos activos</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-[var(--neutral-200)]">
          {rides.map((ride) => (
            <li
              key={ride.id}
              role="button"
              tabIndex={0}
              onClick={() => useRidesStore.getState().selectRide(ride.id)}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') &&
                useRidesStore.getState().selectRide(ride.id)
              }
              className={`flex flex-col justify-center px-3 py-2 cursor-pointer transition-colors border-l-2 ${
                selectedRideId === ride.id
                  ? 'bg-[var(--neutral-200)]'
                  : 'hover:bg-[var(--neutral-100)]'
              }`}
              style={{ borderLeftColor: RIDE_STATUS_BORDER[ride.status] }}
              aria-selected={selectedRideId === ride.id}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[var(--text-xs)] text-[var(--neutral-500)] font-medium">
                  #{ride.id.slice(0, 4).toUpperCase()}
                </span>
                <span className="text-[var(--text-xs)] text-[var(--neutral-500)]">
                  · {formatRequestedAt(ride.requestedAt)}
                </span>
              </div>
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)] truncate font-medium leading-tight">
                {ride.passenger?.name ?? 'Pasajero'} · {ride.pickupAddress}
              </p>
              {ride.destinationAddress && (
                <p className="text-[var(--text-xs)] text-[var(--neutral-500)] truncate leading-tight">
                  → {ride.destinationAddress}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function LeftColumn() {
  const [activeTab, setActiveTab] = useState<Tab>('drivers');
  const density = useUIStore((s) => s.density);
  const onlineDrivers = useOnlineDrivers();
  const activeRides = useActiveRides();

  const rowHeight = density === 'comfortable' ? 64 : density === 'compact' ? 56 : 48;

  const tabLabels: [Tab, string, number][] = [
    ['drivers', 'Choferes', onlineDrivers.length],
    ['rides', 'Pedidos', activeRides.length],
  ];

  return (
    <aside
      className="flex flex-col border-r border-[var(--neutral-200)] bg-[var(--neutral-50)] overflow-hidden"
      aria-label="Panel izquierdo"
    >
      {/* Tab bar */}
      <div role="tablist" className="flex border-b border-[var(--neutral-200)] shrink-0">
        {tabLabels.map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 text-[var(--text-sm)] font-medium transition-colors ${
              activeTab === id
                ? 'border-b-2 border-[var(--brand-primary)] text-[var(--neutral-900)]'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-[var(--text-xs)] tabular-nums">
                ({count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Drivers panel */}
      <div
        id="panel-drivers"
        role="tabpanel"
        aria-label="Lista de choferes"
        hidden={activeTab !== 'drivers'}
        className="flex-1 overflow-hidden"
      >
        <DriversPanel rowHeight={rowHeight} />
      </div>

      {/* Rides panel */}
      <div
        id="panel-rides"
        role="tabpanel"
        aria-label="Pedidos activos"
        hidden={activeTab !== 'rides'}
        className="flex-1 overflow-hidden"
      >
        <RidesPanel />
      </div>
    </aside>
  );
}
