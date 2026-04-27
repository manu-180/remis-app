'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { env } from '@/lib/env';
import { DRIVER_STATUS_COLORS, MOCK_DRIVERS } from '@/lib/mock/drivers';

const Map = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), {
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

const MOCK_ZONES = [
  { id: '1', name: 'Centro',    drivers: 4, rides: 2 },
  { id: '2', name: 'Norte',     drivers: 2, rides: 1 },
  { id: '3', name: 'Sur',       drivers: 3, rides: 0 },
  { id: '4', name: 'Periferia', drivers: 1, rides: 0 },
];

const CENTER = { lng: -64.2938, lat: -36.6167 };

export function CenterColumn() {
  const [view, setView] = useState<View>('map');

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
          <Map
            initialViewState={{ longitude: CENTER.lng, latitude: CENTER.lat, zoom: 13 }}
            mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            {MOCK_DRIVERS.filter((d) => d.distanceKm != null).map((driver) => (
              <Marker
                key={driver.id}
                longitude={CENTER.lng + driver.lngOffset}
                latitude={CENTER.lat + driver.latOffset}
                anchor="center"
              >
                <div
                  className="size-8 rounded-full border-2 border-white flex items-center justify-center text-[var(--text-xs)] font-bold text-white shadow-[var(--shadow-md)]"
                  style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
                  title={`${driver.internalNumber} — ${driver.name}`}
                >
                  {driver.internalNumber}
                </div>
              </Marker>
            ))}
          </Map>
        </div>
      )}

      {view === 'zones' && (
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-y-auto content-start">
          {MOCK_ZONES.map((zone) => (
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
          ))}
        </div>
      )}
    </main>
  );
}
