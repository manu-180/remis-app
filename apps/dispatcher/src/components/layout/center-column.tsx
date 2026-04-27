'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { env } from '@/lib/env';
import { DRIVER_STATUS_COLORS } from '@/lib/mock/drivers';
import { useOnlineDrivers, useDriversStore } from '@/stores/drivers-store';
import { useActiveRides, useRidesStore } from '@/stores/rides-store';
import { useRealtimeSetup } from '@/lib/supabase/use-realtime-setup';

const MapGL = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[var(--neutral-0)] text-[var(--neutral-500)]">
      Cargando mapa…
    </div>
  ),
});

const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), {
  ssr: false,
});

type View = 'map' | 'zones';

const CENTER = { lng: -64.2938, lat: -36.6167 };

interface ContextMenu {
  driverId: string;
  x: number;
  y: number;
}

export function CenterColumn() {
  const [view, setView] = useState<View>('map');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useRealtimeSetup();

  const onlineDrivers = useOnlineDrivers();
  const activeRides = useActiveRides();
  const selectedDriverId = useDriversStore((s) => s.selectedDriverId);

  // Build zones data from online drivers + active rides
  const zoneMap = new Map<string, { name: string; drivers: number; rides: number }>();
  for (const driver of onlineDrivers) {
    // Use driver id as a zone key if no zone — group by first letter of name as fallback
    const zoneId = 'zone-default';
    const existing = zoneMap.get(zoneId) ?? { name: 'General', drivers: 0, rides: 0 };
    existing.drivers += 1;
    zoneMap.set(zoneId, existing);
  }
  for (const ride of activeRides) {
    const zoneId = ride.pickupZoneId ?? 'zone-default';
    const existing = zoneMap.get(zoneId) ?? { name: zoneId, drivers: 0, rides: 0 };
    existing.rides += 1;
    zoneMap.set(zoneId, existing);
  }

  const zones = Array.from(zoneMap.entries()).map(
    ([id, data]: [string, { name: string; drivers: number; rides: number }]) => ({
      id,
      ...data,
    }),
  );

  const handleDriverClick = useCallback((driverId: string) => {
    useDriversStore.getState().selectDriver(driverId);
  }, []);

  const handleDriverRightClick = useCallback(
    (e: React.MouseEvent, driverId: string) => {
      e.preventDefault();
      setContextMenu({ driverId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Close on Escape key
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contextMenu, closeContextMenu]);

  // Close on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [contextMenu, closeContextMenu]);

  const handleAsignarPedido = useCallback(() => {
    if (!contextMenu) return;
    const selectedRideId = useRidesStore.getState().selectedRideId;
    if (selectedRideId) {
      useRidesStore.getState().assignRide(selectedRideId, contextMenu.driverId);
    }
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleSuspenderTurno = useCallback(() => {
    if (!contextMenu) return;
    useDriversStore.getState().setDriverStatus(contextMenu.driverId, 'suspended');
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const selectedRideId = useRidesStore((s) => s.selectedRideId);

  return (
    <main
      id="main-content"
      className="flex flex-col bg-[var(--neutral-0)] overflow-hidden"
      aria-label="Panel central"
    >
      <div
        role="group"
        aria-label="Vista"
        className="flex items-center gap-1 p-2 border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]"
      >
        {(['map', 'zones'] as View[]).map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-[var(--text-sm)] rounded-[var(--radius-md)] transition-colors ${
              view === v
                ? 'bg-[var(--neutral-200)] text-[var(--neutral-900)] font-medium'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
            }`}
          >
            {v === 'map' ? 'Mapa' : 'Zonas'}
          </button>
        ))}
      </div>

      {view === 'map' && (
        <div className="flex-1 relative">
          <MapGL
            initialViewState={{ longitude: CENTER.lng, latitude: CENTER.lat, zoom: 13 }}
            mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            {onlineDrivers
              .filter((d) => d.position != null)
              .map((driver) => {
                const pos = driver.position!;
                const isSelected = selectedDriverId === driver.id;
                return (
                  <Marker
                    key={driver.id}
                    longitude={pos.lng}
                    latitude={pos.lat}
                    anchor="center"
                  >
                    <div
                      className="size-8 rounded-full border-2 flex items-center justify-center text-[var(--text-xs)] font-bold text-white shadow-[var(--shadow-md)] cursor-pointer"
                      style={{
                        backgroundColor: DRIVER_STATUS_COLORS[driver.status],
                        borderColor: isSelected ? 'white' : 'white',
                        boxShadow: isSelected
                          ? '0 0 0 3px white, 0 0 0 5px ' + DRIVER_STATUS_COLORS[driver.status]
                          : undefined,
                      }}
                      title={`${driver.internalNumber} — ${driver.name}`}
                      onClick={() => handleDriverClick(driver.id)}
                      onContextMenu={(e) => handleDriverRightClick(e, driver.id)}
                    >
                      {driver.internalNumber}
                    </div>
                  </Marker>
                );
              })}
          </MapGL>

          {contextMenu && (
            <div
              ref={menuRef}
              className="fixed z-50 min-w-[160px] rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] shadow-[var(--shadow-lg)] py-1"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              {selectedRideId && (
                <button
                  className="w-full text-left px-3 py-2 text-[var(--text-sm)] text-[var(--neutral-800)] hover:bg-[var(--neutral-100)] transition-colors"
                  onClick={handleAsignarPedido}
                >
                  Asignar a pedido
                </button>
              )}
              <button
                className="w-full text-left px-3 py-2 text-[var(--text-sm)] text-[var(--neutral-800)] hover:bg-[var(--neutral-100)] transition-colors"
                onClick={handleSuspenderTurno}
              >
                Suspender turno
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'zones' && (
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-y-auto content-start">
          {zones.length === 0 ? (
            <p className="col-span-2 text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
              Sin choferes activos
            </p>
          ) : (
            zones.map((zone) => (
              <div
                key={zone.id}
                className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-100)] p-4"
              >
                <h3 className="font-semibold text-[var(--neutral-900)] mb-2">{zone.name}</h3>
                <p className="text-[var(--text-sm)] text-[var(--neutral-600)]">
                  {zone.drivers} chofer{zone.drivers !== 1 && 'es'}
                </p>
                <p className="text-[var(--text-sm)] text-[var(--neutral-600)]">
                  {zone.rides} pedido{zone.rides !== 1 && 's'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
