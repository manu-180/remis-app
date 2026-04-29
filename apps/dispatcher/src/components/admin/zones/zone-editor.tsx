'use client';

import { useRef, useEffect, useReducer, useCallback } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { TariffZone } from '@/hooks/use-zones';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const ZONE_COLORS = ['#f97316', '#8b5cf6', '#22c55e', '#eab308'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function parseWktPolygon(wkt: string): [number, number][] {
  const match = wkt.replace(/^SRID=\d+;/, '').match(/POLYGON\s*\(\s*\((.+?)\)\s*\)/i);
  if (!match || !match[1]) return [];
  return match[1].split(',').flatMap((s) => {
    const parts = s.trim().split(/\s+/).map(Number);
    const lng = parts[0];
    const lat = parts[1];
    if (lng === undefined || lat === undefined || isNaN(lng) || isNaN(lat)) return [];
    return [[lng, lat] as [number, number]];
  });
}

function buildWkt(points: [number, number][]): string {
  const first = points[0];
  if (!first) return '';
  const closed = [...points, first];
  const coords = closed.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `SRID=4326;POLYGON((${coords}))`;
}

function zoneColor(zone: TariffZone): string {
  return ZONE_COLORS[(zone.priority - 1) % 4] ?? ZONE_COLORS[0]!;
}

// ---------------------------------------------------------------------------
// Editor state machine
// ---------------------------------------------------------------------------
type EditorMode =
  | { type: 'idle' }
  | { type: 'drawing'; points: [number, number][]; cursor: [number, number] | null }
  | { type: 'editing_vertices'; zoneId: string; vertices: [number, number][] };

type EditorAction =
  | { type: 'START_DRAWING' }
  | { type: 'ADD_POINT'; point: [number, number] }
  | { type: 'MOVE_CURSOR'; cursor: [number, number] }
  | { type: 'CANCEL' }
  | { type: 'START_EDITING'; zoneId: string; vertices: [number, number][] }
  | { type: 'UPDATE_VERTEX'; index: number; vertex: [number, number] }
  | { type: 'RESET' };

function editorReducer(state: EditorMode, action: EditorAction): EditorMode {
  switch (action.type) {
    case 'START_DRAWING':
      return { type: 'drawing', points: [], cursor: null };
    case 'ADD_POINT':
      if (state.type !== 'drawing') return state;
      return { ...state, points: [...state.points, action.point] };
    case 'MOVE_CURSOR':
      if (state.type !== 'drawing') return state;
      return { ...state, cursor: action.cursor };
    case 'CANCEL':
    case 'RESET':
      return { type: 'idle' };
    case 'START_EDITING':
      return { type: 'editing_vertices', zoneId: action.zoneId, vertices: action.vertices };
    case 'UPDATE_VERTEX': {
      if (state.type !== 'editing_vertices') return state;
      const updated = [...state.vertices];
      updated[action.index] = action.vertex;
      return { ...state, vertices: updated };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ZoneEditorInnerProps {
  zones: TariffZone[];
  selectedZoneId: string | null;
  onZoneClick: (id: string) => void;
  drawingMode: boolean;
  onDrawingComplete: (wktPolygon: string, coords: [number, number][]) => void;
  onDrawingCancel: () => void;
  editingZoneId: string | null;
  onVerticesUpdate: (id: string, newWkt: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ZoneEditorInner({
  zones,
  selectedZoneId,
  onZoneClick,
  drawingMode,
  onDrawingComplete,
  onDrawingCancel,
  editingZoneId,
  onVerticesUpdate,
}: ZoneEditorInnerProps) {
  const mapRef = useRef<MapRef>(null);
  const justDoubleClickedRef = useRef(false);

  const [editorState, dispatch] = useReducer(editorReducer, { type: 'idle' });

  // Sync drawing mode with reducer
  useEffect(() => {
    if (drawingMode) {
      dispatch({ type: 'START_DRAWING' });
    } else {
      dispatch({ type: 'RESET' });
    }
  }, [drawingMode]);

  // Sync editing mode
  useEffect(() => {
    if (editingZoneId) {
      const zone = zones.find((z) => z.id === editingZoneId);
      if (zone?.polygon) {
        const verts = parseWktPolygon(zone.polygon);
        dispatch({ type: 'START_EDITING', zoneId: editingZoneId, vertices: verts });
      }
    } else if (editorState.type === 'editing_vertices') {
      dispatch({ type: 'RESET' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingZoneId]);

  // Crosshair cursor when drawing
  useEffect(() => {
    const canvas = mapRef.current?.getMap().getCanvas();
    if (!canvas) return;
    canvas.style.cursor = drawingMode ? 'crosshair' : '';
  }, [drawingMode]);

  // ESC key cancels drawing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDrawingCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDrawingCancel]);

  // Zoom to selected zone
  useEffect(() => {
    if (!selectedZoneId || !mapRef.current) return;
    const zone = zones.find((z) => z.id === selectedZoneId);
    if (!zone?.polygon) return;
    const coords = parseWktPolygon(zone.polygon);
    if (coords.length < 2) return;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 800 }
    );
  }, [selectedZoneId, zones]);

  // ---------------------------------------------------------------------------
  // GeoJSON for existing zones
  // ---------------------------------------------------------------------------
  const zonesGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: zones.flatMap((zone) => {
      const coords = zone.polygon ? parseWktPolygon(zone.polygon) : [];
      if (coords.length < 3) return [];
      return [
        {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [coords] },
          properties: {
            id: zone.id,
            name: zone.name,
            color: zoneColor(zone),
            selected: zone.id === selectedZoneId ? 1 : 0,
          },
        },
      ];
    }),
  };

  // ---------------------------------------------------------------------------
  // GeoJSON for drawing preview
  // ---------------------------------------------------------------------------
  const drawingPoints =
    editorState.type === 'drawing' ? editorState.points : [];
  const drawingCursor =
    editorState.type === 'drawing' ? editorState.cursor : null;

  const previewCoords: [number, number][] =
    drawingPoints.length > 0 && drawingCursor
      ? [...drawingPoints, drawingCursor]
      : drawingPoints;

  const previewGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features:
      previewCoords.length >= 2
        ? [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: previewCoords },
              properties: {},
            },
          ]
        : [],
  };

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      // Skip if dblclick just fired (prevents duplicate points)
      if (justDoubleClickedRef.current) return;

      if (drawingMode && editorState.type === 'drawing') {
        dispatch({ type: 'ADD_POINT', point: [e.lngLat.lng, e.lngLat.lat] });
        return;
      }

      // Zone click detection
      const map = mapRef.current?.getMap();
      if (!map) return;
      const features = map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] });
      const topFeature = features[0];
      if (topFeature) {
        const id = topFeature.properties?.id as string | undefined;
        if (id) onZoneClick(id);
      }
    },
    [drawingMode, editorState.type, onZoneClick]
  );

  const handleMapDblClick = useCallback(
    (e: MapMouseEvent) => {
      if (!drawingMode || editorState.type !== 'drawing') return;

      // Prevent the preceding click from adding an extra point
      justDoubleClickedRef.current = true;
      setTimeout(() => {
        justDoubleClickedRef.current = false;
      }, 300);

      e.preventDefault();

      const pts = editorState.points;
      if (pts.length < 3) return;
      onDrawingComplete(buildWkt(pts), pts);
      dispatch({ type: 'RESET' });
    },
    [drawingMode, editorState, onDrawingComplete]
  );

  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (drawingMode && editorState.type === 'drawing') {
        dispatch({ type: 'MOVE_CURSOR', cursor: [e.lngLat.lng, e.lngLat.lat] });
      }
    },
    [drawingMode, editorState.type]
  );

  // ---------------------------------------------------------------------------
  // Vertex editing markers
  // ---------------------------------------------------------------------------
  const editingVertices =
    editorState.type === 'editing_vertices' ? editorState.vertices : [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -64.3, latitude: -36.625, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="/map-style-dark.json"
        attributionControl={false}
        onClick={handleMapClick}
        onDblClick={handleMapDblClick}
        onMouseMove={handleMouseMove}
      >
        {/* ── Existing zones ── */}
        <Source id="zones" type="geojson" data={zonesGeoJSON}>
          <Layer
            id="zones-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': ['case', ['==', ['get', 'selected'], 1], 0.3, 0.15],
            }}
          />
          <Layer
            id="zones-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['case', ['==', ['get', 'selected'], 1], 3, 2],
            }}
          />
          <Layer
            id="zones-label"
            type="symbol"
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 13,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-anchor': 'center',
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0,0,0,0.7)',
              'text-halo-width': 1.5,
            }}
          />
        </Source>

        {/* ── Drawing preview line ── */}
        <Source id="drawing-preview" type="geojson" data={previewGeoJSON}>
          <Layer
            id="drawing-preview-line"
            type="line"
            paint={{
              'line-color': '#f97316',
              'line-width': 2,
              'line-dasharray': [4, 3],
            }}
          />
        </Source>

        {/* ── Drawing points (dots) ── */}
        {drawingPoints.map(([lng, lat], i) => (
          <Marker key={i} longitude={lng} latitude={lat} anchor="center">
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#f97316',
                border: '2px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
              }}
            />
          </Marker>
        ))}

        {/* ── Vertex editing markers ── */}
        {editingZoneId &&
          editingVertices.map(([lng, lat], i) => (
            <Marker
              key={`v-${i}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              draggable
              onDrag={(e) => {
                dispatch({
                  type: 'UPDATE_VERTEX',
                  index: i,
                  vertex: [e.lngLat.lng, e.lngLat.lat],
                });
              }}
              onDragEnd={(e) => {
                if (editorState.type !== 'editing_vertices') return;
                const updated = [...editorState.vertices];
                updated[i] = [e.lngLat.lng, e.lngLat.lat];
                onVerticesUpdate(editingZoneId, buildWkt(updated));
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  border: '2px solid white',
                  cursor: 'move',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                }}
              />
            </Marker>
          ))}
      </Map>

      {/* ── Drawing tooltip overlay ── */}
      {drawingMode && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10"
          style={{
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            color: 'white',
            fontSize: 'var(--text-sm)',
            whiteSpace: 'nowrap',
          }}
        >
          Click para agregar punto · Doble click para cerrar · Esc para cancelar
          {drawingPoints.length > 0 && (
            <span
              style={{
                marginLeft: 12,
                color: 'var(--brand-accent)',
                fontWeight: 600,
              }}
            >
              {drawingPoints.length} puntos
            </span>
          )}
        </div>
      )}

    </div>
  );
}
