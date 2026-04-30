'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertOctagon, CheckCircle2, Eye, Clock, ShieldAlert } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import {
  DataTable,
  FilterBar,
  createDateColumn,
  createActionsColumn,
} from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// MapLibre dynamic imports (SSR off)
// ---------------------------------------------------------------------------
const MapGL = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), { ssr: false });
const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Popup), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SosProfile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type SosEvent = {
  id: string;
  ride_id: string | null;
  triggered_by: string;
  triggered_role: string;
  location: { type: 'Point'; coordinates: [number, number] } | null;
  prior_locations: unknown[] | null;
  driver_snapshot: Record<string, unknown> | null;
  passenger_snapshot: Record<string, unknown> | null;
  vehicle_snapshot: Record<string, unknown> | null;
  dispatched_to_dispatcher: boolean | null;
  dispatched_at: string | null;
  dispatched_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  profiles: SosProfile | null;
};

type KpiData = {
  active: number;
  resolvedToday: number;
  avgResponseSeconds: number;
};

type StatusFilter = 'active' | 'resolved' | 'all';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;
const LA_PAMPA_CENTER = { lat: -36.62, lng: -64.29 };

function roleIcon(role: string) {
  switch (role) {
    case 'passenger': return '👤';
    case 'driver':    return '🚗';
    case 'dispatcher': return '📡';
    default: return '⚠️';
  }
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function extractCoords(loc: SosEvent['location']): [number, number] | null {
  if (!loc || !Array.isArray(loc.coordinates)) return null;
  return [loc.coordinates[0], loc.coordinates[1]];
}

// ---------------------------------------------------------------------------
// SOS map (active + resolved-24h markers)
// ---------------------------------------------------------------------------
type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  active: boolean;
  sos: SosEvent;
};

function SosMapInner({
  markers,
  highlightedId,
  onSelectMarker,
}: {
  markers: MapMarker[];
  highlightedId: string | null;
  onSelectMarker: (id: string | null) => void;
}) {
  const router = useRouter();
  const [popupId, setPopupId] = useState<string | null>(null);

  const popupMarker = popupId ? markers.find((m) => m.id === popupId) : null;

  return (
    <div className="h-[360px] rounded-[var(--radius-lg)] overflow-hidden">
      <MapGL
        id="sos-overview-map"
        initialViewState={{
          longitude: LA_PAMPA_CENTER.lng,
          latitude: LA_PAMPA_CENTER.lat,
          zoom: 11,
        }}
        mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
        onClick={() => {
          setPopupId(null);
          onSelectMarker(null);
        }}
      >
        {markers.map((m) => {
          const isHighlighted = highlightedId === m.id;
          const size = m.active ? 22 : 14;
          const innerSize = m.active ? 11 : 8;
          return (
            <Marker
              key={m.id}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupId(m.id);
                onSelectMarker(m.id);
              }}
            >
              <div
                className="relative flex items-center justify-center cursor-pointer"
                style={{ width: size, height: size }}
              >
                {m.active && (
                  <span
                    className="absolute inline-flex rounded-full opacity-60"
                    style={{
                      width: size,
                      height: size,
                      background: 'var(--danger)',
                      animation: 'pulse-soft 1.5s ease-in-out infinite',
                    }}
                  />
                )}
                <span
                  className="relative inline-flex rounded-full"
                  style={{
                    width: innerSize,
                    height: innerSize,
                    background: m.active ? 'var(--danger)' : 'var(--neutral-400)',
                    border: isHighlighted
                      ? '3px solid var(--brand-primary)'
                      : '2px solid white',
                    boxShadow: isHighlighted ? '0 0 0 2px white' : '0 0 4px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            </Marker>
          );
        })}

        {popupMarker && (
          <Popup
            longitude={popupMarker.lng}
            latitude={popupMarker.lat}
            anchor="bottom"
            offset={16}
            onClose={() => {
              setPopupId(null);
              onSelectMarker(null);
            }}
            closeButton
            closeOnClick={false}
          >
            <div className="text-[var(--text-sm)] space-y-1 min-w-[180px]">
              <div className="flex items-center gap-1 font-semibold">
                <span>{roleIcon(popupMarker.sos.triggered_role)}</span>
                <span>{popupMarker.sos.profiles?.full_name ?? 'Desconocido'}</span>
              </div>
              <p className="text-[var(--text-xs)] text-[var(--neutral-500)] capitalize">
                {popupMarker.sos.triggered_role}
                {' · '}
                {formatDistanceToNow(new Date(popupMarker.sos.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
              {popupMarker.active ? (
                <StatusPill variant="danger" label="Activo" pulse />
              ) : (
                <StatusPill variant="online" label="Resuelto" />
              )}
              <button
                className="mt-1 text-[var(--brand-primary)] underline text-[var(--text-xs)]"
                onClick={() => router.push(`/admin/sos/${popupMarker.id}`)}
              >
                Abrir detalle →
              </button>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}

const SosMap = dynamic(() => Promise.resolve(SosMapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[360px]" />,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SosListClient() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, unknown>>({ q: '', role: [] as string[] });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const activeCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Active SOS
  const { data: activeSos, refetch: activeRefetch } = useSupabaseQuery<SosEvent[]>(
    ['sos-active'],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb as any)
        .from('sos_events')
        .select('*, profiles!sos_events_triggered_by_fkey(full_name, phone, avatar_url)')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      return { data: data ?? [], error };
    },
  );

  // Resolved last 24h (for grey map markers)
  const { data: recentResolved, refetch: recentResolvedRefetch } = useSupabaseQuery<SosEvent[]>(
    ['sos-resolved-24h'],
    async (sb) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb as any)
        .from('sos_events')
        .select('*, profiles!sos_events_triggered_by_fkey(full_name, phone, avatar_url)')
        .gte('resolved_at', since)
        .order('resolved_at', { ascending: false });
      return { data: data ?? [], error };
    },
  );

  // Historical SOS (last 30 days, with status filter)
  const { data: historicData, isLoading, error, refetch } = useSupabaseQuery<{
    data: SosEvent[];
    count: number;
  }>(
    ['sos-history', page, filters, statusFilter],
    async (sb) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const roleFilter = Array.isArray(filters.role) ? (filters.role as string[]) : [];
      const q = typeof filters.q === 'string' ? filters.q : '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (sb as any)
        .from('sos_events')
        .select(
          '*, profiles!sos_events_triggered_by_fkey(full_name, phone, avatar_url)',
          { count: 'exact' },
        )
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (statusFilter === 'active') {
        query = query.is('resolved_at', null);
      } else if (statusFilter === 'resolved') {
        query = query.not('resolved_at', 'is', null);
      }

      if (roleFilter.length > 0) {
        query = query.in('triggered_role', roleFilter);
      }
      if (q) {
        query = query.ilike('triggered_role', `%${q}%`);
      }

      const { data, error: qErr, count } = await query;
      return {
        data: { data: (data ?? []) as SosEvent[], count: count ?? 0 },
        error: qErr,
      };
    },
  );

  // KPI stats
  const { data: kpi, isLoading: kpiLoading } = useSupabaseQuery<KpiData>(
    ['sos-kpi'],
    async (sb) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [activeRes, resolvedRes, avgRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sb as any).from('sos_events').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sb as any)
          .from('sos_events')
          .select('id', { count: 'exact', head: true })
          .gte('resolved_at', todayStart.toISOString()),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sb as any)
          .from('sos_events')
          .select('created_at, resolved_at')
          .not('resolved_at', 'is', null)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      let avgResponseSeconds = 0;
      if (avgRes.data && avgRes.data.length > 0) {
        const total = avgRes.data.reduce((acc: number, row: { created_at: string; resolved_at: string }) => {
          const diff = differenceInSeconds(new Date(row.resolved_at), new Date(row.created_at));
          return acc + diff;
        }, 0);
        avgResponseSeconds = Math.round(total / avgRes.data.length);
      }

      return {
        data: {
          active: activeRes.count ?? 0,
          resolvedToday: resolvedRes.count ?? 0,
          avgResponseSeconds,
        },
        error: null,
      };
    },
  );

  // Realtime: refetch all queries on any sos_events change
  useRealtimeTable('sos_events', { event: '*' }, () => {
    refetch();
    activeRefetch();
    recentResolvedRefetch();
  });

  // Build map markers from active + resolved-24h
  const mapMarkers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    for (const sos of activeSos ?? []) {
      const coords = extractCoords(sos.location);
      if (!coords) continue;
      out.push({ id: sos.id, lng: coords[0], lat: coords[1], active: true, sos });
    }
    for (const sos of recentResolved ?? []) {
      const coords = extractCoords(sos.location);
      if (!coords) continue;
      out.push({ id: sos.id, lng: coords[0], lat: coords[1], active: false, sos });
    }
    return out;
  }, [activeSos, recentResolved]);

  // When map marker clicked → scroll list card into view
  useEffect(() => {
    if (!highlightedId) return;
    const node = activeCardRefs.current.get(highlightedId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedId]);

  const historicSos = historicData?.data ?? [];
  const totalCount = historicData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Table columns
  const columns: ColumnDef<SosEvent, unknown>[] = [
    createDateColumn<SosEvent>('created_at', 'Tiempo') as ColumnDef<SosEvent, unknown>,
    {
      id: 'triggered_by_col',
      header: 'Disparado por',
      enableSorting: false,
      cell: ({ row }: { row: { original: SosEvent } }) => {
        const sos = row.original;
        const name = sos.profiles?.full_name ?? 'Desconocido';
        return (
          <div className="flex items-center gap-2">
            <span>{roleIcon(sos.triggered_role)}</span>
            <div>
              <p className="font-medium text-[var(--text-sm)]">{name}</p>
              <p className="text-[var(--text-xs)] text-[var(--neutral-500)] capitalize">{sos.triggered_role}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'ride_col',
      header: 'Viaje',
      enableSorting: false,
      cell: ({ row }: { row: { original: SosEvent } }) => {
        const rideId = row.original.ride_id;
        if (!rideId) return <span className="text-[var(--neutral-400)]">—</span>;
        return (
          <span className="font-mono text-[var(--text-xs)] bg-[var(--neutral-100)] px-2 py-0.5 rounded">
            #{shortId(rideId)}
          </span>
        );
      },
    },
    {
      id: 'status_col',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }: { row: { original: SosEvent } }) => {
        const sos = row.original;
        if (sos.resolved_at) {
          return <StatusPill variant="online" label="Resuelto" />;
        }
        return <StatusPill variant="danger" label="Activo" pulse />;
      },
    },
    {
      id: 'resolved_by_col',
      header: 'Resuelto por',
      enableSorting: false,
      cell: ({ row }: { row: { original: SosEvent } }) => {
        const notes = row.original.resolution_notes;
        if (!row.original.resolved_at) return <span className="text-[var(--neutral-400)]">—</span>;
        return (
          <span className="text-[var(--text-sm)]" title={notes ?? undefined}>
            {row.original.resolved_by ? shortId(row.original.resolved_by) : '—'}
          </span>
        );
      },
    },
    {
      id: 'response_time_col',
      header: 'Tiempo respuesta',
      enableSorting: false,
      cell: ({ row }: { row: { original: SosEvent } }) => {
        const sos = row.original;
        if (!sos.resolved_at) return <span className="text-[var(--neutral-400)]">—</span>;
        const secs = differenceInSeconds(new Date(sos.resolved_at), new Date(sos.created_at));
        return (
          <span className="font-mono tabular-nums text-[var(--text-sm)]">
            {formatSeconds(secs)}
          </span>
        );
      },
    },
    createActionsColumn<SosEvent>([
      {
        icon: <Eye size={14} />,
        label: 'Ver detalle',
        onClick: (row) => router.push(`/admin/sos/${row.id}`),
      },
    ]) as ColumnDef<SosEvent, unknown>,
  ];

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'active', label: 'Activos' },
    { id: 'resolved', label: 'Resueltos' },
    { id: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Centro SOS"
        description="Emergencias activas y registro histórico de los últimos 30 días."
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <Stat
            label="Emergencias activas"
            value={kpi?.active ?? 0}
            icon={<AlertOctagon size={16} className="text-[var(--danger)]" />}
            loading={kpiLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Resueltos hoy"
            value={kpi?.resolvedToday ?? 0}
            icon={<CheckCircle2 size={16} className="text-[var(--success)]" />}
            loading={kpiLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Tiempo prom. respuesta (7d)"
            value={kpi ? formatSeconds(kpi.avgResponseSeconds) : '—'}
            icon={<Clock size={16} />}
            loading={kpiLoading}
          />
        </Card>
      </div>

      {/* Active + Map row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active SOS list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-[var(--danger)]" />
              Activos ahora
              {(kpi?.active ?? 0) > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--danger)', color: 'white' }}
                >
                  {kpi!.active}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 min-h-[200px] max-h-[360px] overflow-y-auto">
            {activeSos === null ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : activeSos.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2
                  className="mx-auto mb-2"
                  size={32}
                  style={{ color: 'var(--success)' }}
                />
                <p className="font-semibold text-[var(--success)]">Sin emergencias activas</p>
                <p className="text-sm text-[var(--neutral-500)] mt-1">Buen turno 🙏</p>
              </div>
            ) : (
              activeSos.map((sos) => {
                const isHighlighted = highlightedId === sos.id;
                return (
                  <div
                    key={sos.id}
                    ref={(el) => {
                      if (el) activeCardRefs.current.set(sos.id, el);
                      else activeCardRefs.current.delete(sos.id);
                    }}
                    className="p-4 rounded-[var(--radius-md)] cursor-pointer hover:opacity-90 transition-all"
                    style={{
                      background: 'var(--danger-bg)',
                      borderLeft: '4px solid var(--danger)',
                      animation: 'pulse-soft 2s ease-in-out infinite',
                      outline: isHighlighted ? '2px solid var(--brand-primary)' : undefined,
                      outlineOffset: isHighlighted ? '2px' : undefined,
                    }}
                    onClick={() => router.push(`/admin/sos/${sos.id}`)}
                    onMouseEnter={() => setHighlightedId(sos.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                  >
                    <div className="flex items-start gap-3">
                      <AlertOctagon
                        size={20}
                        className="shrink-0 mt-0.5"
                        style={{ color: 'var(--danger)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--neutral-900)]">
                            {roleIcon(sos.triggered_role)}{' '}
                            {sos.profiles?.full_name ?? 'Desconocido'}
                          </span>
                          {sos.ride_id && (
                            <span
                              className="font-mono text-[var(--text-xs)] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--danger)', color: 'white' }}
                            >
                              #{shortId(sos.ride_id)}
                            </span>
                          )}
                          <span className="ml-auto text-xs text-[var(--neutral-500)]">
                            {formatDistanceToNow(new Date(sos.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        </div>
                        <p className="text-[var(--text-sm)] text-[var(--neutral-600)] mt-0.5 capitalize">
                          {sos.triggered_role}
                          {sos.profiles?.phone && (
                            <> · <a href={`tel:${sos.profiles.phone}`} className="underline" onClick={(e) => e.stopPropagation()}>{sos.profiles.phone}</a></>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Mapa de emergencias</span>
              <span className="flex items-center gap-3 text-[var(--text-xs)] font-normal text-[var(--neutral-500)]">
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, background: 'var(--danger)' }}
                  />
                  Activo
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, background: 'var(--neutral-400)' }}
                  />
                  Resuelto 24h
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {mapMarkers.length === 0 ? (
              <div className="h-[360px] rounded-[var(--radius-lg)] flex items-center justify-center bg-[var(--neutral-50)] border border-[var(--neutral-200)] text-center text-[var(--neutral-500)] text-sm">
                <div>
                  <p className="font-medium text-[var(--neutral-700)]">Sin marcadores</p>
                  <p className="mt-1">No hay SOS activos ni resueltos en las últimas 24h.</p>
                </div>
              </div>
            ) : (
              <SosMap
                markers={mapMarkers}
                highlightedId={highlightedId}
                onSelectMarker={setHighlightedId}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-3">
            <span>Historial — últimos 30 días</span>
            <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--neutral-100)]">
              {statusTabs.map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className="px-3 py-1 text-[var(--text-sm)] font-medium rounded transition-colors"
                    style={{
                      background: isActive ? 'white' : 'transparent',
                      color: isActive ? 'var(--neutral-900)' : 'var(--neutral-500)',
                      boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : undefined,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <FilterBar
            filters={[
              { id: 'q', type: 'search', placeholder: 'Buscar por rol...' },
              {
                id: 'role',
                type: 'multiselect',
                label: 'Rol',
                options: [
                  { value: 'passenger', label: 'Pasajero' },
                  { value: 'driver', label: 'Conductor' },
                  { value: 'dispatcher', label: 'Despachador' },
                  { value: 'admin', label: 'Admin' },
                ],
              },
            ]}
            value={filters}
            onChange={(v) => {
              setFilters(v);
              setPage(1);
            }}
          />

          <DataTable
            columns={columns}
            data={historicSos}
            loading={isLoading}
            error={error}
            onRowClick={(row) => router.push(`/admin/sos/${row.id}`)}
            {...(totalPages > 1
              ? {
                  pagination: {
                    pageIndex: page - 1,
                    pageSize: PAGE_SIZE,
                    total: totalCount,
                    onChange: ({ pageIndex }: { pageIndex: number; pageSize: number }) =>
                      setPage(pageIndex + 1),
                  },
                }
              : {})}
            emptyState={
              <div className="py-16 text-center text-[var(--neutral-500)] text-sm">
                {statusFilter === 'active'
                  ? 'No hay SOS activos en los últimos 30 días.'
                  : statusFilter === 'resolved'
                  ? 'No hay SOS resueltos en los últimos 30 días.'
                  : 'No hay eventos SOS en los últimos 30 días.'}
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

