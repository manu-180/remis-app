'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Car } from 'lucide-react';
import { z } from 'zod';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// Schema (mirrors RPC get_shared_trip)
// ---------------------------------------------------------------------------
const sharedTripSchema = z.object({
  ride_id: z.string(),
  status: z.string(),
  driver_id: z.string().nullable(),
  driver_first_name: z.string().nullable(),
  driver_mobile: z.string().nullable(),
  vehicle_plate: z.string().nullable(),
  vehicle_make: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  vehicle_color: z.string().nullable(),
  pickup_address: z.string().nullable(),
  pickup_lat: z.number().nullable(),
  pickup_lng: z.number().nullable(),
  dest_address: z.string().nullable(),
  dest_lat: z.number().nullable(),
  dest_lng: z.number().nullable(),
  started_at: z.string().nullable(),
  requested_at: z.string().nullable(),
  driver_lat: z.number().nullable(),
  driver_lng: z.number().nullable(),
  driver_heading: z.number().nullable(),
  expires_at: z.string().nullable(),
});

export type SharedTrip = z.infer<typeof sharedTripSchema>;

// ---------------------------------------------------------------------------
// MapLibre dynamic imports
// ---------------------------------------------------------------------------
const MapGL = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), { ssr: false });
const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), { ssr: false });
const Source = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Source), { ssr: false });
const Layer = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Layer), { ssr: false });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estimateEtaMinutes(
  driver: { lat: number; lng: number },
  target: { lat: number; lng: number },
): number {
  const distanceKm = haversineKm(driver, target);
  const speedKmh = 30;
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

type StatusKey =
  | 'pending'
  | 'assigned'
  | 'en_route_to_pickup'
  | 'waiting_passenger'
  | 'on_trip'
  | 'completed'
  | 'cancelled_by_passenger'
  | 'cancelled_by_driver'
  | 'cancelled_by_dispatcher'
  | 'no_show';

function statusHeadline(status: string, destAddress: string | null): string {
  switch (status as StatusKey) {
    case 'pending':
      return 'Buscando un remis para tu pedido';
    case 'assigned':
      return 'Asignamos un remis a tu pedido';
    case 'en_route_to_pickup':
      return 'Tu remis esta en camino';
    case 'waiting_passenger':
      return 'Tu remis llego. Esperando que subas';
    case 'on_trip':
      return destAddress ? `En viaje a ${destAddress}` : 'En viaje';
    case 'completed':
      return 'Viaje completado. Gracias!';
    case 'cancelled_by_passenger':
    case 'cancelled_by_driver':
    case 'cancelled_by_dispatcher':
      return 'Viaje cancelado';
    case 'no_show':
      return 'El conductor no pudo encontrarte';
    default:
      return 'Seguimiento del viaje';
  }
}

function statusTone(status: string): 'info' | 'success' | 'warning' | 'danger' {
  if (status.startsWith('cancelled') || status === 'no_show') return 'danger';
  if (status === 'completed') return 'success';
  if (status === 'waiting_passenger') return 'warning';
  return 'info';
}

function isActive(status: string): boolean {
  return ['assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip'].includes(status);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface SharedTripClientProps {
  initialTrip: SharedTrip;
  token: string;
}

const POLL_INTERVAL_MS = 5000;

export function SharedTripClient({ initialTrip, token }: SharedTripClientProps) {
  const [trip, setTrip] = useState<SharedTrip>(initialTrip);
  const [expired, setExpired] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // ---- Polling: fetch RPC every 5s ----
  const fetchTrip = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_shared_trip', {
        p_token: tokenRef.current,
      });
      if (error) {
        if (error.code === 'P0003' || /expirado|invalido/i.test(error.message)) {
          setExpired(true);
        }
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      const parsed = sharedTripSchema.safeParse(row);
      if (parsed.success) {
        setTrip(parsed.data);
      }
    } catch {
      // ignore — siguiente tick reintenta
    }
  }, [supabase]);

  useEffect(() => {
    if (!isActive(trip.status)) return;
    const id = setInterval(fetchTrip, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchTrip, trip.status]);

  // ---- Realtime subscription a rides para cambios de status ----
  useEffect(() => {
    if (!trip.ride_id) return;
    const ch = supabase
      .channel(`shared-trip-${trip.ride_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${trip.ride_id}`,
        },
        () => {
          // Status puede haber cambiado: refrescamos la RPC para obtener fields derivados.
          void fetchTrip();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, trip.ride_id, fetchTrip]);

  // ---- Initial view: punto medio entre pickup y driver (si hay) o pickup ----
  const initialView = useMemo(() => {
    const pickupLat = initialTrip.pickup_lat;
    const pickupLng = initialTrip.pickup_lng;
    const driverLat = initialTrip.driver_lat;
    const driverLng = initialTrip.driver_lng;

    if (pickupLat != null && pickupLng != null && driverLat != null && driverLng != null) {
      return {
        latitude: (pickupLat + driverLat) / 2,
        longitude: (pickupLng + driverLng) / 2,
        zoom: 14,
      };
    }
    if (pickupLat != null && pickupLng != null) {
      return { latitude: pickupLat, longitude: pickupLng, zoom: 14 };
    }
    // Fallback al centro de Santa Rosa, La Pampa
    return { latitude: -36.6167, longitude: -64.2938, zoom: 12 };
  }, [initialTrip.pickup_lat, initialTrip.pickup_lng, initialTrip.driver_lat, initialTrip.driver_lng]);

  // ---- Linestring entre puntos relevantes segun status ----
  const lineData = useMemo(() => {
    const { status, driver_lat, driver_lng, pickup_lat, pickup_lng, dest_lat, dest_lng } = trip;
    if (status === 'on_trip' && driver_lat != null && driver_lng != null && dest_lat != null && dest_lng != null) {
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [driver_lng, driver_lat],
            [dest_lng, dest_lat],
          ],
        },
        properties: {},
      };
    }
    if (
      ['assigned', 'en_route_to_pickup', 'waiting_passenger'].includes(status) &&
      driver_lat != null &&
      driver_lng != null &&
      pickup_lat != null &&
      pickup_lng != null
    ) {
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [driver_lng, driver_lat],
            [pickup_lng, pickup_lat],
          ],
        },
        properties: {},
      };
    }
    if (pickup_lat != null && pickup_lng != null && dest_lat != null && dest_lng != null) {
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [pickup_lng, pickup_lat],
            [dest_lng, dest_lat],
          ],
        },
        properties: {},
      };
    }
    return null;
  }, [trip]);

  // ---- ETA estimado ----
  const etaMinutes = useMemo(() => {
    if (trip.driver_lat == null || trip.driver_lng == null) return null;
    if (trip.status === 'on_trip' && trip.dest_lat != null && trip.dest_lng != null) {
      return estimateEtaMinutes(
        { lat: trip.driver_lat, lng: trip.driver_lng },
        { lat: trip.dest_lat, lng: trip.dest_lng },
      );
    }
    if (
      ['assigned', 'en_route_to_pickup'].includes(trip.status) &&
      trip.pickup_lat != null &&
      trip.pickup_lng != null
    ) {
      return estimateEtaMinutes(
        { lat: trip.driver_lat, lng: trip.driver_lng },
        { lat: trip.pickup_lat, lng: trip.pickup_lng },
      );
    }
    return null;
  }, [trip]);

  if (expired) {
    return <ExpiredView />;
  }

  const tone = statusTone(trip.status);

  return (
    <div className="fixed inset-0" data-theme="dark">
      {/* Map fullscreen */}
      <MapGL
        initialViewState={initialView}
        mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Route line */}
        {lineData && (
          <>
            <Source id="trip-route" type="geojson" data={lineData} />
            <Layer
              id="trip-route-line"
              source="trip-route"
              type="line"
              paint={{
                'line-color': '#f59e0b',
                'line-width': 4,
                'line-opacity': 0.9,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </>
        )}

        {/* Pickup marker */}
        {trip.pickup_lat != null && trip.pickup_lng != null && (
          <Marker longitude={trip.pickup_lng} latitude={trip.pickup_lat} anchor="bottom">
            <PinDot color="var(--success, #16a34a)" label="Origen" />
          </Marker>
        )}

        {/* Destination marker */}
        {trip.dest_lat != null && trip.dest_lng != null && (
          <Marker longitude={trip.dest_lng} latitude={trip.dest_lat} anchor="bottom">
            <PinDot color="var(--danger, #dc2626)" label="Destino" />
          </Marker>
        )}

        {/* Driver marker (rotated by heading) */}
        {trip.driver_lat != null && trip.driver_lng != null && (
          <Marker longitude={trip.driver_lng} latitude={trip.driver_lat} anchor="center">
            <CarMarker heading={trip.driver_heading ?? 0} />
          </Marker>
        )}
      </MapGL>

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 px-3 pt-3 pointer-events-none">
        <div
          className="pointer-events-auto mx-auto max-w-xl rounded-2xl border bg-black/70 backdrop-blur-md text-white shadow-2xl px-4 py-3 sm:px-5 sm:py-4"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-start gap-3">
            <StatusBadge tone={tone} />
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-semibold leading-tight truncate">
                {statusHeadline(trip.status, trip.dest_address)}
              </p>
              {(trip.driver_first_name || trip.vehicle_plate) && (
                <p className="text-xs sm:text-sm text-white/75 mt-0.5 truncate">
                  {trip.driver_first_name && (
                    <span className="font-medium text-white/90">{trip.driver_first_name}</span>
                  )}
                  {trip.driver_first_name && (trip.vehicle_make || trip.vehicle_plate) && ' · '}
                  {[trip.vehicle_make, trip.vehicle_model, trip.vehicle_color]
                    .filter(Boolean)
                    .join(' ')}
                  {trip.vehicle_plate && (
                    <>
                      {' '}
                      <span className="font-mono text-white/90">({trip.vehicle_plate})</span>
                    </>
                  )}
                </p>
              )}
              {isActive(trip.status) && etaMinutes != null && (
                <p className="text-xs sm:text-sm text-amber-300 mt-1 font-medium">
                  Llega en aproximadamente {etaMinutes} min
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer brand */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="rounded-full bg-black/60 backdrop-blur px-3 py-1 text-[10px] tracking-wide text-white/70">
          RemisDespacho
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
function StatusBadge({ tone }: { tone: 'info' | 'success' | 'warning' | 'danger' }) {
  const colors: Record<typeof tone, string> = {
    info: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  };
  return (
    <div className="shrink-0 mt-0.5">
      <span
        className="block w-2.5 h-2.5 rounded-full animate-pulse"
        style={{ background: colors[tone], boxShadow: `0 0 0 4px ${colors[tone]}33` }}
      />
    </div>
  );
}

function PinDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center" aria-label={label}>
      <div
        className="w-4 h-4 rounded-full border-2 border-white"
        style={{ background: color, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
      />
      <div
        className="w-0.5 h-3"
        style={{ background: 'rgba(255,255,255,0.6)' }}
      />
    </div>
  );
}

function CarMarker({ heading }: { heading: number }) {
  return (
    <div
      className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-400 border-2 border-white shadow-lg"
      style={{
        transform: `rotate(${heading}deg)`,
        transition: 'transform 600ms ease-out',
      }}
      aria-label="Conductor"
    >
      <Car size={20} className="text-black" />
    </div>
  );
}

function ExpiredView() {
  return (
    <div className="min-h-screen bg-[var(--neutral-50)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-[var(--neutral-300)]">Link expirado</p>
        <p className="mt-3 text-base text-[var(--neutral-700)]">
          El link del viaje compartido expiro o fue revocado.
        </p>
        <p className="mt-1 text-sm text-[var(--neutral-500)]">
          Pedile a quien te lo envio que comparta uno nuevo.
        </p>
      </div>
    </div>
  );
}
