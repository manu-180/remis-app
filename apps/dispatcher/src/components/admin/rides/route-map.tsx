'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// Dynamic imports — SSR disabled for MapLibre
// ---------------------------------------------------------------------------
const MapGL = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), { ssr: false });
const Source = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Source), { ssr: false });
const Layer = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Layer), { ssr: false });
const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), { ssr: false });
const UseMap = dynamic(
  () => import('react-map-gl/maplibre').then((m) => {
    // useMap is a hook — we wrap it in a component
    const { useMap } = m;

    function BoundsFitter({
      pickupLat,
      pickupLng,
      destLat,
      destLng,
    }: {
      pickupLat: number;
      pickupLng: number;
      destLat?: number | undefined;
      destLng?: number | undefined;
    }) {
      const { current: map } = useMap();

      useEffect(() => {
        if (!map) return;
        if (destLat != null && destLng != null) {
          const minLng = Math.min(pickupLng, destLng);
          const maxLng = Math.max(pickupLng, destLng);
          const minLat = Math.min(pickupLat, destLat);
          const maxLat = Math.max(pickupLat, destLat);
          map.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 60, duration: 800 },
          );
        } else {
          map.flyTo({ center: [pickupLng, pickupLat], zoom: 14, duration: 600 });
        }
      }, [map, pickupLat, pickupLng, destLat, destLng]);

      return null;
    }

    return { default: BoundsFitter };
  }),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
type GeoJSONLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

function parseRouteGeometry(routeGeometry: string | object): GeoJSONLineString | null {
  try {
    const geo = typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry;
    if (geo && geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
      return geo as GeoJSONLineString;
    }
  } catch {
    // ignore
  }
  return null;
}

function buildStraightLine(
  pickupLng: number,
  pickupLat: number,
  destLng: number,
  destLat: number,
): GeoJSONLineString {
  return {
    type: 'LineString',
    coordinates: [
      [pickupLng, pickupLat],
      [destLng, destLat],
    ],
  };
}

// ---------------------------------------------------------------------------
// Marker dots
// ---------------------------------------------------------------------------
function PickupDot() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--success)',
        border: '2.5px solid white',
        boxShadow: '0 0 0 2px var(--success)',
      }}
    />
  );
}

function DestinationDot() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--danger)',
        border: '2.5px solid white',
        boxShadow: '0 0 0 2px var(--danger)',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface RouteMapProps {
  pickupLat: number;
  pickupLng: number;
  destLat?: number | undefined;
  destLng?: number | undefined;
  routeGeometry?: string | object | null | undefined;
}

// ---------------------------------------------------------------------------
// Inner map (rendered only client-side)
// ---------------------------------------------------------------------------
function RouteMapInner({ pickupLat, pickupLng, destLat, destLng, routeGeometry }: {
  pickupLat: number;
  pickupLng: number;
  destLat?: number | undefined;
  destLng?: number | undefined;
  routeGeometry?: string | object | null | undefined;
}) {
  // Determine the line to draw
  let lineData: GeoJSONLineString | null = null;
  if (routeGeometry) {
    lineData = parseRouteGeometry(routeGeometry);
  }
  if (!lineData && destLat != null && destLng != null) {
    lineData = buildStraightLine(pickupLng, pickupLat, destLng, destLat);
  }

  const initialView = {
    longitude: pickupLng,
    latitude: pickupLat,
    zoom: 13,
  };

  return (
    <div className="h-[400px] rounded-[var(--radius-lg)] overflow-hidden">
      <MapGL
        id="route-map"
        initialViewState={initialView}
        mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Auto-fit bounds */}
        <UseMap
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          destLat={destLat}
          destLng={destLng}
        />

        {/* Route line */}
        {lineData && (
          <>
            <Source
              id="route"
              type="geojson"
              data={lineData}
            />
            <Layer
              id="route-line"
              source="route"
              type="line"
              paint={{
                'line-color': 'var(--brand-primary)',
                'line-width': 3,
                'line-opacity': 0.85,
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
            />
          </>
        )}

        {/* Pickup marker */}
        <Marker longitude={pickupLng} latitude={pickupLat} anchor="center">
          <PickupDot />
        </Marker>

        {/* Destination marker */}
        {destLat != null && destLng != null && (
          <Marker longitude={destLng} latitude={destLat} anchor="center">
            <DestinationDot />
          </Marker>
        )}
      </MapGL>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component — dynamic to avoid SSR issues
// ---------------------------------------------------------------------------
const RouteMapDynamic = dynamic(
  () => Promise.resolve(RouteMapInner),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px]" />,
  },
);

export function RouteMap(props: RouteMapProps) {
  return <RouteMapDynamic {...props} />;
}
