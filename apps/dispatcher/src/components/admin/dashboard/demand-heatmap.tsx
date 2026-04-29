'use client';

import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';

interface PickupPoint {
  lng: number;
  lat: number;
}

// NOTA: requiere RPC pickup_locations_24h() — ver supabase/migrations/
export function DemandHeatmapInner() {
  const { data: points } = useSupabaseQuery<PickupPoint[]>(
    ['pickup-locations-24h'],
    async (sb) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (sb as any).rpc('pickup_locations_24h') as Promise<{
          data: PickupPoint[] | null;
          error: unknown;
        }>;
      } catch {
        return { data: [], error: null };
      }
    }
  );

  const safePoints = points ?? [];

  const geojsonData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: safePoints.map((p) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.lng, p.lat],
      },
      properties: {},
    })),
  };

  return (
    <div className="relative w-full" style={{ height: '320px' }}>
      <Map
        initialViewState={{
          longitude: -64.30,
          latitude: -36.625,
          zoom: 12,
        }}
        style={{ width: '100%', height: '320px' }}
        mapStyle="/map-style-dark.json"
        attributionControl={false}
      >
        {safePoints.length > 0 && (
          <Source type="geojson" data={geojsonData}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': 1,
                'heatmap-intensity': 1,
                'heatmap-radius': 20,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.2, 'rgba(217,119,6,0.3)',
                  0.5, 'rgba(217,119,6,0.7)',
                  0.8, 'rgba(220,38,38,0.8)',
                  1, 'rgba(220,38,38,1)',
                ],
                'heatmap-opacity': 0.8,
              }}
            />
          </Source>
        )}
      </Map>
      <div className="absolute bottom-3 right-3 glass rounded-[var(--radius-md)] px-3 py-2 text-xs flex items-center gap-2 pointer-events-none">
        <span
          className="inline-block w-16 h-2 rounded-full"
          style={{
            background:
              'linear-gradient(to right, rgba(217,119,6,0.3), rgba(220,38,38,1))',
          }}
        />
        <span className="text-[var(--neutral-300)]">Baja → Alta</span>
      </div>
    </div>
  );
}
