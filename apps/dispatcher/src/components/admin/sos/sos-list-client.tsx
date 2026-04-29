'use client';

import { useState } from 'react';
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
import type { PillVariant } from '@/components/ui/status-pill';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SosListClient() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, unknown>>({ q: '', role: [] as string[] });
  const [page, setPage] = useState(1);

  // Active SOS (no pagination — these are critical)
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

  // Historical SOS (last 30 days)
  const { data: historicData, isLoading, error, refetch } = useSupabaseQuery<{
    data: SosEvent[];
    count: number;
  }>(
    ['sos-history', page, filters],
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

  // Realtime
  useRealtimeTable('sos_events', { event: '*' }, () => {
    refetch();
    activeRefetch();
  });

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
          <CardContent className="pt-0 space-y-3 min-h-[200px]">
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
              activeSos.map((sos) => (
                <div
                  key={sos.id}
                  className="p-4 rounded-[var(--radius-md)] cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    background: 'var(--danger-bg)',
                    borderLeft: '4px solid var(--danger)',
                    animation: 'pulse-soft 2s ease-in-out infinite',
                  }}
                  onClick={() => router.push(`/admin/sos/${sos.id}`)}
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
              ))
            )}
          </CardContent>
        </Card>

        {/* Map placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa de emergencias</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[200px] text-center text-[var(--neutral-500)] text-sm">
            <div>
              <p className="font-medium text-[var(--neutral-700)]">Mapa disponible en el detalle</p>
              <p className="mt-1">Hacé clic en una emergencia activa para ver su ubicación en el mapa.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial — últimos 30 días</CardTitle>
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
                No hay eventos SOS en los últimos 30 días.
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

