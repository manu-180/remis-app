'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Ban, Users, Wifi, Car, AlertOctagon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import {
  DataTable,
  FilterBar,
  createAvatarColumn,
  createStatusColumn,
  createTabularColumn,
  createDateColumn,
  createActionsColumn,
} from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import type { PillVariant } from '@/components/ui/status-pill';
import { DriverFormDrawer } from './driver-form-drawer';
import type { DriverWithProfile } from './driver-profile-client';

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
export function mapDriverStatus(status: string): { variant: PillVariant; label: string } {
  const map: Record<string, { variant: PillVariant; label: string }> = {
    available: { variant: 'online', label: 'Disponible' },
    en_route_to_pickup: { variant: 'busy', label: 'En camino' },
    waiting_passenger: { variant: 'busy', label: 'Esperando' },
    on_trip: { variant: 'busy', label: 'En viaje' },
    on_break: { variant: 'offline', label: 'En descanso' },
    offline: { variant: 'offline', label: 'Desconectado' },
    suspended: { variant: 'danger', label: 'Suspendido' },
  };
  return map[status] ?? { variant: 'offline', label: status };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DriverRow = {
  id: string;
  is_active: boolean;
  is_online: boolean;
  current_status: string;
  rating: number | null;
  total_rides: number | null;
  updated_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    deleted_at: string | null;
  } | null;
  vehicles: {
    id: string;
    plate: string | null;
    make: string | null;
    model: string | null;
  } | null;
};

type StatsData = {
  total: number;
  online: number;
  enViaje: number;
  suspendidos: number;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;

export function DriversListClient() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, unknown>>({ q: '', status: [] as string[] });
  const [page, setPage] = useState(1);
  const [newDrawerOpen, setNewDrawerOpen] = useState(false);
  const [editDrawer, setEditDrawer] = useState<{ open: boolean; driver: DriverWithProfile | null }>({
    open: false,
    driver: null,
  });

  // KPI stats
  const { data: stats, isLoading: statsLoading } = useSupabaseQuery<StatsData>(
    ['driver-stats'],
    async (sb) => {
      const [total, online, enViaje, suspendidos] = await Promise.all([
        sb.from('drivers').select('id', { count: 'exact', head: true }),
        sb.from('drivers').select('id', { count: 'exact', head: true }).eq('is_online', true),
        sb
          .from('drivers')
          .select('id', { count: 'exact', head: true })
          .in('current_status', ['en_route_to_pickup', 'waiting_passenger', 'on_trip']),
        sb
          .from('drivers')
          .select('id', { count: 'exact', head: true })
          .eq('current_status', 'suspended'),
      ]);
      return {
        data: {
          total: total.count ?? 0,
          online: online.count ?? 0,
          enViaje: enViaje.count ?? 0,
          suspendidos: suspendidos.count ?? 0,
        },
        error: null,
      };
    },
  );

  const q = typeof filters.q === 'string' ? filters.q : '';
  const statusFilter = Array.isArray(filters.status) ? (filters.status as string[]) : [];

  // Drivers list
  const { data: driversData, isLoading, error, refetch } = useSupabaseQuery<{
    data: DriverRow[];
    count: number;
  }>(
    ['drivers-list', filters, page],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (sb as any)
        .from('drivers')
        .select(
          `
            id, is_active, is_online, current_status, rating, total_rides, updated_at,
            profiles!inner(id, full_name, phone, avatar_url, deleted_at),
            vehicles(id, plate, make, model)
          `,
          { count: 'exact' },
        )
        .is('profiles.deleted_at', null)
        .order('updated_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (q) {
        query = query.or(
          `profiles.full_name.ilike.%${q}%,profiles.phone.ilike.%${q}%`,
        );
      }
      if (statusFilter.length > 0) {
        query = query.in('current_status', statusFilter);
      }

      const result = await query;
      return {
        data: { data: (result.data ?? []) as DriverRow[], count: result.count ?? 0 },
        error: result.error,
      };
    },
  );

  // Realtime subscriptions
  useRealtimeTable('drivers', { event: 'UPDATE' }, () => refetch());
  useRealtimeTable('driver_current_location', { event: '*' }, () => refetch());

  const drivers = driversData?.data ?? [];
  const totalCount = driversData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Columns — typed as unknown to accommodate mixed column types
  const columns: ColumnDef<DriverRow, unknown>[] = [
    createAvatarColumn<DriverRow>(
      (row) => row.profiles?.avatar_url ?? null,
      (row) => row.profiles?.full_name ?? 'Sin nombre',
    ) as ColumnDef<DriverRow, unknown>,
    createStatusColumn<DriverRow>(
      (row) => mapDriverStatus(row.current_status),
      'driver',
    ) as ColumnDef<DriverRow, unknown>,
    {
      id: 'vehicle',
      header: 'Vehículo',
      enableSorting: false,
      cell: ({ row }: { row: { original: DriverRow } }) => {
        const v = row.original.vehicles;
        if (!v) return <span className="text-[var(--neutral-400)]">Sin vehículo</span>;
        const label = [v.plate, [v.make, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
        return <span className="truncate text-[var(--text-sm)]">{label || '—'}</span>;
      },
    },
    createTabularColumn<DriverRow>('rating', 'Rating', { suffix: '★' }) as ColumnDef<DriverRow, unknown>,
    createTabularColumn<DriverRow>('total_rides', 'Viajes') as ColumnDef<DriverRow, unknown>,
    createDateColumn<DriverRow>('updated_at', 'Últ. actividad') as ColumnDef<DriverRow, unknown>,
    createActionsColumn<DriverRow>([
      {
        icon: <Eye size={14} />,
        label: 'Ver perfil',
        onClick: (row) => router.push(`/admin/drivers/${row.id}`),
      },
      {
        icon: <Pencil size={14} />,
        label: 'Editar',
        onClick: (row) => setEditDrawer({ open: true, driver: row as unknown as DriverWithProfile }),
      },
      {
        icon: <Ban size={14} />,
        label: 'Suspender',
        onClick: async (row) => {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sb = getSupabaseBrowserClient() as any;
          await sb
            .from('drivers')
            .update({ current_status: 'suspended', is_active: false })
            .eq('id', row.id);
          refetch();
        },
        danger: true,
      },
    ]) as ColumnDef<DriverRow, unknown>,
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Conductores"
        description="Gestión y seguimiento de conductores."
        actions={
          <Button variant="primary" onClick={() => setNewDrawerOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Nuevo conductor
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <Stat
            label="Total conductores"
            value={stats?.total ?? 0}
            icon={<Users size={16} />}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="En línea"
            value={stats?.online ?? 0}
            icon={<Wifi size={16} />}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="En viaje"
            value={stats?.enViaje ?? 0}
            icon={<Car size={16} />}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Suspendidos"
            value={stats?.suspendidos ?? 0}
            icon={<AlertOctagon size={16} />}
            loading={statsLoading}
          />
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { id: 'q', type: 'search', placeholder: 'Buscar por nombre, teléfono...' },
          {
            id: 'status',
            type: 'multiselect',
            label: 'Estado',
            options: [
              { value: 'available', label: 'Disponible' },
              { value: 'en_route_to_pickup', label: 'En camino' },
              { value: 'on_trip', label: 'En viaje' },
              { value: 'offline', label: 'Desconectado' },
              { value: 'suspended', label: 'Suspendido' },
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
        data={drivers}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/admin/drivers/${row.id}`)}
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
            No hay conductores que coincidan con los filtros.
          </div>
        }
      />

      {/* Drawers */}
      <DriverFormDrawer
        open={newDrawerOpen}
        onOpenChange={setNewDrawerOpen}
        onSuccess={(driverId) => router.push(`/admin/drivers/${driverId}`)}
      />

      {editDrawer.driver && (
        <DriverFormDrawer
          open={editDrawer.open}
          onOpenChange={(v) => setEditDrawer((prev) => ({ ...prev, open: v }))}
          initialData={editDrawer.driver}
          onSuccess={() => { refetch(); setEditDrawer({ open: false, driver: null }); }}
        />
      )}
    </div>
  );
}
