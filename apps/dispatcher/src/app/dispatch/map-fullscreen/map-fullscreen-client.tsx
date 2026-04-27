'use client';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useOnlineDrivers, useDriversStore } from '@/stores/drivers-store';
import { useRealtimeSetup } from '@/lib/supabase/use-realtime-setup';
import { useBroadcastSync } from '@/hooks/use-broadcast-sync';
import { DRIVER_STATUS_COLORS } from '@/lib/mock/drivers';
import { env } from '@/lib/env';

const MapGL = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), { ssr: false });
const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), { ssr: false });

const CENTER = { lng: -64.2938, lat: -36.6167 };

export function MapFullscreenClient() {
  useRealtimeSetup();
  useBroadcastSync('secondary');

  const onlineDrivers = useOnlineDrivers();
  const selectedDriverId = useDriversStore((s) => s.selectedDriverId);

  return (
    <div className="fixed inset-0 bg-black" data-theme="dark">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-sm">
        <span className="font-bold text-white text-sm tracking-tight">RemisDespacho — Vista mapa</span>
        <button
          onClick={() => window.close()}
          aria-label="Cerrar ventana"
          className="text-white/70 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

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
              <Marker key={driver.id} longitude={pos.lng} latitude={pos.lat} anchor="center">
                <div
                  className="size-10 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: DRIVER_STATUS_COLORS[driver.status],
                    borderColor: 'white',
                    boxShadow: isSelected
                      ? `0 0 0 3px white, 0 0 0 5px ${DRIVER_STATUS_COLORS[driver.status]}`
                      : undefined,
                  }}
                  title={`${driver.internalNumber} — ${driver.name}`}
                  onClick={() => useDriversStore.getState().selectDriver(driver.id)}
                >
                  {driver.internalNumber}
                </div>
              </Marker>
            );
          })}
      </MapGL>
    </div>
  );
}
