'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import {
  DataTable,
  createStatusColumn,
  createCurrencyColumn,
  createDateColumn,
} from '@/components/admin/data-table';
import type { PillVariant } from '@/components/ui/status-pill';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RideRow = {
  id: string;
  status: string | null;
  pickup_address: string | null;
  dest_address: string | null;
  final_fare_ars: number | null;
  requested_at: string | null;
};

// ---------------------------------------------------------------------------
// Status mapping for rides
// ---------------------------------------------------------------------------
function mapRideStatus(status: string | null): { variant: PillVariant; label: string } {
  const map: Record<string, { variant: PillVariant; label: string }> = {
    completed: { variant: 'online', label: 'Completado' },
    cancelled_by_driver: { variant: 'danger', label: 'Cancelado conductor' },
    cancelled_by_passenger: { variant: 'offline', label: 'Cancelado pasajero' },
    no_show: { variant: 'danger', label: 'No show' },
    in_progress: { variant: 'busy', label: 'En progreso' },
    pending: { variant: 'pending', label: 'Pendiente' },
  };
  return map[status ?? ''] ?? { variant: 'offline', label: status ?? '—' };
}

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface DriverTabViajesProps {
  driverId: string;
}

export function DriverTabViajes({ driverId }: DriverTabViajesProps) {
  const [page, setPage] = useState(1);
  const router = useRouter();

  const { data: ridesData, isLoading, error } = useSupabaseQuery<{
    data: RideRow[];
    count: number;
  }>(
    ['driver-rides', driverId, page],
    async (sb) => {
      const result = await sb
        .from('rides')
        .select(
          'id, status, pickup_address, dest_address, final_fare_ars, requested_at',
          { count: 'exact' },
        )
        .eq('driver_id', driverId)
        .order('requested_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      return {
        data: { data: (result.data ?? []) as RideRow[], count: result.count ?? 0 },
        error: result.error,
      };
    },
  );

  const rides = ridesData?.data ?? [];
  const totalCount = ridesData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const columns: ColumnDef<RideRow, unknown>[] = [
    createDateColumn<RideRow>('requested_at', 'Fecha') as ColumnDef<RideRow, unknown>,
    {
      id: 'pickup',
      header: 'Origen',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => (
        <div className="flex items-center gap-1.5 max-w-[160px]">
          <MapPin size={12} className="text-[var(--neutral-400)] shrink-0" />
          <span className="truncate text-sm" title={row.original.pickup_address ?? ''}>
            {row.original.pickup_address ?? '—'}
          </span>
        </div>
      ),
    },
    {
      id: 'dest',
      header: 'Destino',
      enableSorting: false,
      cell: ({ row }: { row: { original: RideRow } }) => (
        <div className="flex items-center gap-1.5 max-w-[160px]">
          <Navigation size={12} className="text-[var(--neutral-400)] shrink-0" />
          <span className="truncate text-sm" title={row.original.dest_address ?? ''}>
            {row.original.dest_address ?? '—'}
          </span>
        </div>
      ),
    },
    createStatusColumn<RideRow>(
      (row) => mapRideStatus(row.status),
      'ride',
    ) as ColumnDef<RideRow, unknown>,
    createCurrencyColumn<RideRow>('final_fare_ars', 'Tarifa') as ColumnDef<RideRow, unknown>,
  ];

  const paginationProp =
    totalPages > 1
      ? {
          pageIndex: page - 1,
          pageSize: PAGE_SIZE,
          total: totalCount,
          onChange: ({ pageIndex }: { pageIndex: number }) => setPage(pageIndex + 1),
        }
      : undefined;

  return (
    <DataTable
      columns={columns}
      data={rides}
      loading={isLoading}
      error={error}
      onRowClick={(row: RideRow) => router.push(`/admin/rides/${row.id}`)}
      {...(paginationProp ? { pagination: paginationProp } : {})}
    />
  );
}
