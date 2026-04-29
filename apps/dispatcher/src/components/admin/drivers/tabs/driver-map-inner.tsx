'use client';

import { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Car, Signal, Battery, Navigation } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DriverLocation = {
  driver_id: string;
  location: string | null; // geography
  heading: number | null;
  speed_mps: number | null;
  battery_pct: number | null;
  status: string | null;
  updated_at: string | null;
  // Parsed from geography
  longitude?: number;
  latitude?: number;
};

// ---------------------------------------------------------------------------
// Parse PostGIS geography to lat/lng
// The geography column from Supabase comes as a GeoJSON-like object or WKB
// When selected via REST, it returns as {type:'Point',coordinates:[lng,lat]}
// ---------------------------------------------------------------------------
function parseLocation(location: unknown): { lng: number; lat: number } | null {
  if (!location) return null;
  try {
    const geo = typeof location === 'string' ? JSON.parse(location) : location;
    if (geo && geo.type === 'Point' && Array.isArray(geo.coordinates)) {
      return { lng: geo.coordinates[0] as number, lat: geo.coordinates[1] as number };
    }
  } catch {
    // ignore
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const INITIAL_VIEW = { longitude: -64.3, latitude: -36.625, zoom: 13 };

interface DriverMapInnerProps {
  driverId: string;
}

export function DriverMapInner({ driverId }: DriverMapInnerProps) {
  const { data: locationData, isLoading, refetch } = useSupabaseQuery<DriverLocation | null>(
    ['driver-location', driverId],
    async (sb) => {
      const result = await sb
        .from('driver_current_location')
        .select('driver_id, location, heading, speed_mps, battery_pct, status, updated_at')
        .eq('driver_id', driverId)
        .maybeSingle();
      return { data: result.data as DriverLocation | null, error: result.error };
    },
  );

  useRealtimeTable(
    'driver_current_location',
    { event: '*', filter: `driver_id=eq.${driverId}` },
    () => refetch(),
  );

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />;

  if (!locationData) {
    return (
      <Card>
        <EmptyState
          icon={<Car size={28} />}
          title="Sin ubicación disponible"
          description="Este conductor aún no ha reportado su ubicación."
        />
      </Card>
    );
  }

  const coords = parseLocation(locationData.location);
  const now = new Date();
  const lastSeen = locationData.updated_at ? new Date(locationData.updated_at) : null;
  const isStale = lastSeen ? (now.getTime() - lastSeen.getTime()) > 5 * 60 * 1000 : true;
  const speedKmh = locationData.speed_mps != null ? Math.round(locationData.speed_mps * 3.6) : null;

  const viewState = coords
    ? { longitude: coords.lng, latitude: coords.lat, zoom: 14 }
    : INITIAL_VIEW;

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="h-96 rounded-[var(--radius-lg)] overflow-hidden">
        <Map
          initialViewState={viewState}
          mapStyle="/map-style-dark.json"
          style={{ width: '100%', height: '100%' }}
        >
          {coords && (
            <Marker longitude={coords.lng} latitude={coords.lat} anchor="center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full shadow-[var(--shadow-md)]',
                  isStale
                    ? 'bg-[var(--neutral-400)]'
                    : 'bg-[var(--brand-accent)]',
                )}
                title={isStale ? `Sin señal desde ${lastSeen ? relativeTime(lastSeen) : '—'}` : 'Ubicación actual'}
              >
                <Car size={20} className="text-white" />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Navigation size={18} className="text-[var(--neutral-400)] shrink-0" />
            <div>
              <p className="text-xs text-[var(--neutral-500)]">Velocidad</p>
              <p className="text-sm font-semibold text-[var(--neutral-900)]">
                {speedKmh != null ? `${speedKmh} km/h` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Car size={18} className="text-[var(--neutral-400)] shrink-0" />
            <div>
              <p className="text-xs text-[var(--neutral-500)]">Heading</p>
              <p className="text-sm font-semibold text-[var(--neutral-900)]">
                {locationData.heading != null ? `${Math.round(locationData.heading)}°` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Battery size={18} className={cn('shrink-0', locationData.battery_pct != null && locationData.battery_pct < 20 ? 'text-[var(--danger)]' : 'text-[var(--neutral-400)]')} />
            <div>
              <p className="text-xs text-[var(--neutral-500)]">Batería</p>
              <p className="text-sm font-semibold text-[var(--neutral-900)]">
                {locationData.battery_pct != null ? `${locationData.battery_pct}%` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal status */}
      {lastSeen && (
        <p className={cn('text-xs', isStale ? 'text-[var(--warning)]' : 'text-[var(--neutral-500)]')}>
          <Signal size={12} className="inline mr-1" />
          {isStale
            ? `Sin señal desde ${relativeTime(lastSeen)}`
            : `Última actualización ${relativeTime(lastSeen)}`}
        </p>
      )}
    </div>
  );
}
