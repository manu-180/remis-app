'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, XCircle, Car, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useExportCsv } from '@/hooks/use-export-csv';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DataTable,
  FilterBar,
  ExportCsvButton,
  createStatusColumn,
  createDateColumn,
  createActionsColumn,
} from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { StatusPill } from '@/components/ui/status-pill';
import type { PillVariant } from '@/components/ui/status-pill';
import { formatARS } from '@/lib/format';
import { escapeOrFilter } from '@/lib/postgrest-safe';
import type { CsvColumn } from '@/lib/export-csv';

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
export function mapRideStatus(status: string): { variant: PillVariant; label: string } {
  const map: Record<string, { variant: PillVariant; label: string }> = {
    requested: { variant: 'offline', label: 'Solicitado' },
    assigned: { variant: 'online', label: 'Asignado' },
    en_route_to_pickup: { variant: 'busy', label: 'En camino' },
    waiting_passenger: { variant: 'busy', label: 'Esperando' },
    on_trip: { variant: 'online', label: 'En viaje' },
    completed: { variant: 'online', label: 'Completado' },
    cancelled_by_passenger: { variant: 'danger', label: 'Cancelado' },
    cancelled_by_driver: { variant: 'danger', label: 'Cancelado' },
    cancelled_by_dispatcher: { variant: 'danger', label: 'Cancelado' },
    no_show: { variant: 'danger', label: 'No-show' },
  };
  return map[status] ?? { variant: 'offline', label: status };
}

const ACTIVE_STATUSES = ['requested', 'assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PassengerProfile = { full_name: string | null; phone: string | null };
type DriverProfile = { full_name: string | null };
type Vehicle = { plate: string | null };

type RideRow = {
  id: string;
  status: string;
  requested_at: string | null;
  assigned_at: string | null;
  pickup_address: string | null;
  dest_address: string | null;
  final_fare_ars: number | null;
  estimated_fare_ars: number | null;
  payment_method: string | null;
  payment_status: string | null;
  vehicle_type_requested: string | null;
  passenger_count: number | null;
  requested_via: string | null;
  passengers: {
    profiles: PassengerProfile | null;
  } | null;
  drivers: {
    profiles: DriverProfile | null;
    vehicles: Vehicle | null;
  } | null;
};

type StatsData = {
  pedidosHoy: number;
  completadosHoy: number;
  canceladosHoy: number;
  avgAssignSecs: number | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function paymentIcon(method: string | null) {
  switch (method) {
    case 'mp_checkout': return '💳';
    case 'account':    return '🏦';
    default:           return '💵';
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const PAGE_SIZE = 50;

export function RidesListClient() {
  const router = useRouter();

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultTo = now.toISOString().split('T')[0];

  const [filters, setFilters] = useState<Record<string, unknown>>({
    q: '',
    status: [] as string[],
    fecha: { from: defaultFrom, to: defaultTo },
    payment: [] as string[],
  });
  const [page, setPage] = useState(1);

  // KPI stats
  const { data: stats, isLoading: statsLoading } = useSupabaseQuery<StatsData>(
    ['rides-stats'],
    async (sb) => {
      const today = todayIso();
      const [pedidos, completados, cancelados] = await Promise.all([
        sb
          .from('rides')
          .select('id', { count: 'exact', head: true })
          .gte('requested_at', today + 'T00:00:00')
          .lte('requested_at', today + 'T23:59:59'),
        sb
          .from('rides')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('requested_at', today + 'T00:00:00')
          .lte('requested_at', today + 'T23:59:59'),
        sb
          .from('rides')
          .select('id', { count: 'exact', head: true })
          .in('status', ['cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_by_dispatcher', 'no_show'])
          .gte('requested_at', today + 'T00:00:00')
          .lte('requested_at', today + 'T23:59:59'),
      ]);

      return {
        data: {
          pedidosHoy: pedidos.count ?? 0,
          completadosHoy: completados.count ?? 0,
          canceladosHoy: cancelados.count ?? 0,
          avgAssignSecs: null,
        },
        error: null,
      };
    },
  );

  const q = typeof filters.q === 'string' ? filters.q : '';
  const statusFilter = Array.isArray(filters.status) ? (filters.status as string[]) : [];
  const paymentFilter = Array.isArray(filters.payment) ? (filters.payment as string[]) : [];
  const dateFilter =
    typeof filters.fecha === 'object' && filters.fecha !== null
      ? (filters.fecha as { from?: string; to?: string })
      : {};

  // Rides list
  const {
    data: ridesData,
    isLoading,
    error,
    refetch,
  } = useSupabaseQuery<{ data: RideRow[]; count: number }>(
    ['rides-list', filters, page],
    async (sb) => {
      const from = dateFilter.from ?? defaultFrom;
      const to = dateFilter.to ?? defaultTo;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (sb as any)
        .from('rides')
        .select(
          `
            id, status, requested_at, assigned_at, pickup_address, dest_address,
            final_fare_ars, estimated_fare_ars, payment_method, payment_status,
            vehicle_type_requested, passenger_count, requested_via,
            passengers!rides_passenger_id_fkey(
              profiles!inner(full_name, phone)
            ),
            drivers!rides_driver_id_fkey(
              profiles!inner(full_name),
              vehicles(plate)
            )
          `,
          { count: 'exact' },
        )
        .gte('requested_at', from + 'T00:00:00')
        .lte('requested_at', to + 'T23:59:59')
        .order('requested_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }
      if (paymentFilter.length > 0) {
        query = query.in('payment_method', paymentFilter);
      }
      if (q) {
        const safe = escapeOrFilter(q);
        query = query.or(`pickup_address.ilike.%${safe}%,dest_address.ilike.%${safe}%`);
      }

      const result = await query;
      return {
        data: {
          data: (result.data ?? []) as RideRow[],
          count: result.count ?? 0,
        },
        error: result.error,
      };
    },
  );

  // Realtime
  useRealtimeTable('rides', { event: '*' }, () => refetch());

  const rides = ridesData?.data ?? [];
  const totalCount = ridesData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---------------------------------------------------------------------------
  // CSV export — respects current filters (status, payment, fechas, búsqueda)
  // ---------------------------------------------------------------------------
  const csvColumns: CsvColumn<RideRow>[] = [
    { header: 'ID viaje', accessor: (r) => r.id },
    { header: 'Estado', accessor: (r) => r.status },
    {
      header: 'Pasajero',
      accessor: (r) => r.passengers?.profiles?.full_name ?? '',
    },
    {
      header: 'Teléfono pasajero',
      accessor: (r) => r.passengers?.profiles?.phone ?? '',
    },
    {
      header: 'Conductor',
      accessor: (r) => r.drivers?.profiles?.full_name ?? '',
    },
    {
      header: 'Patente',
      accessor: (r) => r.drivers?.vehicles?.plate ?? '',
    },
    { header: 'Origen', accessor: (r) => r.pickup_address ?? '' },
    { header: 'Destino', accessor: (r) => r.dest_address ?? '' },
    {
      header: 'Tarifa estimada (ARS)',
      accessor: (r) => r.estimated_fare_ars ?? '',
    },
    {
      header: 'Tarifa final (ARS)',
      accessor: (r) => r.final_fare_ars ?? '',
    },
    { header: 'Método de pago', accessor: (r) => r.payment_method ?? '' },
    { header: 'Estado de pago', accessor: (r) => r.payment_status ?? '' },
    { header: 'Vehículo solicitado', accessor: (r) => r.vehicle_type_requested ?? '' },
    { header: 'Pasajeros', accessor: (r) => r.passenger_count ?? '' },
    { header: 'Canal', accessor: (r) => r.requested_via ?? '' },
    { header: 'Pedido (UTC)', accessor: (r) => r.requested_at ?? '' },
    { header: 'Asignado (UTC)', accessor: (r) => r.assigned_at ?? '' },
  ];

  const { exportNow, exporting } = useExportCsv<RideRow>({
    filename: 'rides',
    columns: csvColumns,
    fetchPage: async (offset, limit) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const fromDate = dateFilter.from ?? defaultFrom;
      const toDate = dateFilter.to ?? defaultTo;

      let query = sb
        .from('rides')
        .select(
          `
            id, status, requested_at, assigned_at, pickup_address, dest_address,
            final_fare_ars, estimated_fare_ars, payment_method, payment_status,
            vehicle_type_requested, passenger_count, requested_via,
            passengers!rides_passenger_id_fkey(
              profiles!inner(full_name, phone)
            ),
            drivers!rides_driver_id_fkey(
              profiles!inner(full_name),
              vehicles(plate)
            )
          `,
        )
        .gte('requested_at', fromDate + 'T00:00:00')
        .lte('requested_at', toDate + 'T23:59:59')
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (statusFilter.length > 0) query = query.in('status', statusFilter);
      if (paymentFilter.length > 0) query = query.in('payment_method', paymentFilter);
      if (q) {
        const safe = escapeOrFilter(q);
        query = query.or(`pickup_address.ilike.%${safe}%,dest_address.ilike.%${safe}%`);
      }

      const result = await query;
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? []) as RideRow[];
    },
  });

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------
  const columns: ColumnDef<RideRow, unknown>[] = [
    {
      id: 'short_id',
      header: '#',
      size: 100,
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => (
        <span
          className="font-mono text-xs text-[var(--neutral-600)] tracking-tight"
          title={row.original.id}
        >
          {row.original.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    createStatusColumn<RideRow>(
      (row) => mapRideStatus(row.status),
      'ride',
    ) as ColumnDef<RideRow, unknown>,
    createDateColumn<RideRow>('requested_at', 'Solicitado') as ColumnDef<RideRow, unknown>,
    {
      id: 'passenger',
      header: 'Pasajero',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => {
        const p = row.original.passengers?.profiles;
        if (!p) return <span className="text-[var(--neutral-400)]">—</span>;
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--neutral-900)]">
              {p.full_name ?? '—'}
            </p>
            {p.phone && (
              <p className="truncate text-xs text-[var(--neutral-500)]">{p.phone}</p>
            )}
          </div>
        );
      },
    },
    {
      id: 'pickup',
      header: 'Origen',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => (
        <span
          className="block truncate text-sm max-w-[180px] text-[var(--neutral-700)]"
          title={row.original.pickup_address ?? undefined}
        >
          {row.original.pickup_address ?? '—'}
        </span>
      ),
    },
    {
      id: 'destination',
      header: 'Destino',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => (
        <span
          className="block truncate text-sm max-w-[180px] text-[var(--neutral-700)]"
          title={row.original.dest_address ?? undefined}
        >
          {row.original.dest_address ?? '—'}
        </span>
      ),
    },
    {
      id: 'driver',
      header: 'Conductor',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => {
        const d = row.original.drivers;
        if (!d) return <span className="text-[var(--neutral-400)]">Sin asignar</span>;
        const name = d.profiles?.full_name ?? '—';
        const plate = d.vehicles?.plate;
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--neutral-900)]">{name}</p>
            {plate && (
              <p className="font-mono text-xs text-[var(--neutral-500)]">{plate}</p>
            )}
          </div>
        );
      },
    },
    {
      id: 'fare',
      header: 'Tarifa',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => {
        const fare = row.original.final_fare_ars ?? row.original.estimated_fare_ars;
        const icon = paymentIcon(row.original.payment_method);
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{icon}</span>
            <span className="tabular-nums text-sm text-[var(--neutral-900)]">
              {fare != null ? formatARS(fare) : '—'}
            </span>
          </div>
        );
      },
    },
    createActionsColumn<RideRow>([
      {
        icon: <Eye size={14} />,
        label: 'Ver detalle',
        onClick: (row) => router.push(`/admin/rides/${row.id}`),
      },
      {
        icon: <XCircle size={14} />,
        label: 'Cancelar',
        onClick: (row) => router.push(`/admin/rides/${row.id}`),
        danger: true,
      },
    ]) as ColumnDef<RideRow, unknown>,
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Viajes"
        description="Historial completo de viajes, estados y métricas."
        actions={
          <ExportCsvButton
            onClick={exportNow}
            exporting={exporting}
            emptyHint={totalCount === 0 && !isLoading}
          />
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <Stat
            label="Pedidos hoy"
            value={stats?.pedidosHoy ?? 0}
            icon={<Car size={16} />}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Completados hoy"
            value={stats?.completadosHoy ?? 0}
            icon={<CheckCircle size={16} />}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Cancelados hoy"
            value={stats?.canceladosHoy ?? 0}
            icon={<AlertCircle size={16} />}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="T. prom. asignación"
            value={stats?.avgAssignSecs != null ? `${Math.round(stats.avgAssignSecs)}s` : '—'}
            icon={<Clock size={16} />}
            loading={statsLoading}
          />
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { id: 'q', type: 'search', placeholder: 'Buscar por dirección...' },
          {
            id: 'status',
            type: 'multiselect',
            label: 'Estado',
            options: [
              { value: 'requested', label: 'Solicitado' },
              { value: 'assigned', label: 'Asignado' },
              { value: 'en_route_to_pickup', label: 'En camino' },
              { value: 'waiting_passenger', label: 'Esperando pasajero' },
              { value: 'on_trip', label: 'En viaje' },
              { value: 'completed', label: 'Completado' },
              { value: 'cancelled_by_passenger', label: 'Cancelado (pasajero)' },
              { value: 'cancelled_by_driver', label: 'Cancelado (conductor)' },
              { value: 'cancelled_by_dispatcher', label: 'Cancelado (operador)' },
              { value: 'no_show', label: 'No-show' },
            ],
          },
          { id: 'fecha', type: 'daterange', label: 'Fecha' },
          {
            id: 'payment',
            type: 'multiselect',
            label: 'Pago',
            options: [
              { value: 'cash', label: 'Efectivo' },
              { value: 'mp_checkout', label: 'Mercado Pago' },
              { value: 'account', label: 'Cuenta' },
            ],
          },
        ]}
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={rides}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/admin/rides/${row.id}`)}
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
            No hay viajes que coincidan con los filtros.
          </div>
        }
      />
    </div>
  );
}

// Re-export for convenience
export { ACTIVE_STATUSES };
