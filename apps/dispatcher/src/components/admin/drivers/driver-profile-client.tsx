'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, ChevronDown, Ban, RefreshCw, Star, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { PageBack } from '@/components/admin/page-back';
import { formatPhone, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/ui/user-avatar';
import { mapDriverStatus } from './drivers-list-client';
import { DriverFormDrawer } from './driver-form-drawer';
import { DriverTabResumen } from './tabs/tab-resumen';
import { DriverTabVehiculo } from './tabs/tab-vehiculo';
import { DriverTabDocumentos } from './tabs/tab-documentos';
import { DriverTabKyc } from './tabs/tab-kyc';
import { DriverTabViajes } from './tabs/tab-viajes';
import { DriverTabUbicacion } from './tabs/tab-ubicacion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type DriverWithProfile = {
  id: string;
  is_active: boolean;
  is_online: boolean;
  current_status: string;
  vehicle_id: string | null;
  mobile_number: string | null;
  rating: number | null;
  total_rides: number | null;
  joined_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
    deleted_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  vehicles: {
    id: string;
    plate: string | null;
    make: string | null;
    model: string | null;
    color: string | null;
    year: number | null;
    vehicle_type: string | null;
    is_active: boolean | null;
  } | null;
};

// ---------------------------------------------------------------------------
// Ring color per status
// ---------------------------------------------------------------------------
function getRingColor(status: string): string {
  const map: Record<string, string> = {
    available: 'ring-[var(--success)]',
    on_trip: 'ring-[var(--warning)]',
    en_route_to_pickup: 'ring-[var(--warning)]',
    waiting_passenger: 'ring-[var(--warning)]',
    offline: 'ring-[var(--neutral-400)]',
    on_break: 'ring-[var(--neutral-400)]',
    suspended: 'ring-[var(--danger)]',
  };
  return map[status] ?? 'ring-[var(--neutral-400)]';
}

// ---------------------------------------------------------------------------
// More actions dropdown
// ---------------------------------------------------------------------------
function MoreActionsDropdown({
  driver,
  onRefresh,
}: {
  driver: DriverWithProfile;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const confirm = useConfirm();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseBrowserClient() as any;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleSuspend() {
    setOpen(false);
    const ok = await confirm({
      title: '¿Suspender conductor?',
      description: 'El conductor no podrá recibir viajes.',
      confirmLabel: 'Suspender',
      danger: true,
    });
    if (!ok) return;
    const { error } = await sb
      .from('drivers')
      .update({ current_status: 'suspended', is_active: false })
      .eq('id', driver.id);
    if (error) { toast.error(String(error.message)); return; }
    toast.success('Conductor suspendido');
    onRefresh();
  }

  async function handleReactivate() {
    setOpen(false);
    const { error } = await sb
      .from('drivers')
      .update({ current_status: 'offline', is_active: true })
      .eq('id', driver.id);
    if (error) { toast.error(String(error.message)); return; }
    toast.success('Conductor reactivado');
    onRefresh();
  }

  async function handleResetRating() {
    setOpen(false);
    const ok = await confirm({
      title: 'Resetear rating',
      description: 'Esto pondrá el rating en 5.00 y los viajes totales en 0.',
      danger: true,
    });
    if (!ok) return;
    const { error } = await sb
      .from('drivers')
      .update({ rating: 5.0, total_rides: 0 })
      .eq('id', driver.id);
    if (error) { toast.error(String(error.message)); return; }
    toast.success('Rating reseteado');
    onRefresh();
  }

  async function handleDelete() {
    setOpen(false);
    const ok = await confirm({
      title: '¿Eliminar conductor?',
      description: 'Esto marcará al conductor como eliminado. No se puede deshacer fácilmente.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await sb
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', driver.id);
    if (error) { toast.error(String(error.message)); return; }
    toast.success('Conductor eliminado');
    router.push('/admin/drivers');
  }

  const isSuspended = driver.current_status === 'suspended';

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        Más acciones
        <ChevronDown size={14} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </Button>
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-1 min-w-[200px]',
            'rounded-[var(--radius-md)] border border-[var(--neutral-200)]',
            'bg-[var(--neutral-0)] shadow-[var(--shadow-lg)] py-1',
          )}
        >
          {isSuspended ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-sm)] text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] transition-colors"
              onClick={handleReactivate}
            >
              <RefreshCw size={14} />
              Reactivar
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-sm)] text-[var(--danger)] hover:bg-[var(--neutral-50)] transition-colors"
              onClick={handleSuspend}
            >
              <Ban size={14} />
              Suspender
            </button>
          )}
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-sm)] text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] transition-colors"
            onClick={handleResetRating}
          >
            <Star size={14} />
            Resetear rating
          </button>
          <div className="my-1 border-t border-[var(--neutral-100)]" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-sm)] text-[var(--danger)] hover:bg-[var(--neutral-50)] transition-colors"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            Eliminar conductor
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function DriverProfileClient({ driver: initialDriver }: { driver: DriverWithProfile }) {
  const [driver, setDriver] = useState(initialDriver);
  const [editOpen, setEditOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseBrowserClient() as any;

  async function refetch() {
    const { data } = await sb
      .from('drivers')
      .select(`*, profiles!inner(*), vehicles(*)`)
      .eq('id', driver.id)
      .single();
    if (data) setDriver(data as DriverWithProfile);
  }

  const ringColor = getRingColor(driver.current_status);
  const statusInfo = mapDriverStatus(driver.current_status);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageBack href="/admin/drivers">Conductores</PageBack>

      {/* Profile Header Card */}
      <Card variant="glass" className="relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--brand-primary) 8%, transparent), transparent)',
          }}
        />
        <CardContent className="relative pt-6 flex items-start gap-6 flex-wrap">
          {/* Avatar */}
          <UserAvatar
            size="xl"
            name={driver.profiles.full_name ?? 'Sin nombre'}
            src={driver.profiles.avatar_url}
            ringClass={ringColor}
            seed={driver.id}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--neutral-900)] truncate">
              {driver.profiles.full_name ?? 'Sin nombre'}
            </h1>
            <p className="text-sm text-[var(--neutral-500)] mt-0.5">
              {driver.profiles.phone ? formatPhone(driver.profiles.phone) : ''}
              {driver.profiles.phone && driver.profiles.email ? ' · ' : ''}
              {driver.profiles.email ?? ''}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusPill
                variant={statusInfo.variant}
                label={statusInfo.label}
                pulse={driver.is_online}
              />
              <span className="text-sm text-[var(--neutral-500)]">
                {driver.total_rides ?? 0} viajes &middot; &#9733;{' '}
                {driver.rating ? Number(driver.rating).toFixed(1) : '—'}
              </span>
              {driver.joined_at && (
                <span className="text-sm text-[var(--neutral-500)]">
                  Alta {relativeTime(driver.joined_at)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1" />
              Editar
            </Button>
            <MoreActionsDropdown driver={driver} onRefresh={refetch} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] h-10">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="vehiculo">Vehículo</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="viajes">Viajes</TabsTrigger>
          <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <DriverTabResumen driverId={driver.id} />
        </TabsContent>
        <TabsContent value="vehiculo">
          <DriverTabVehiculo driver={driver} onRefresh={refetch} />
        </TabsContent>
        <TabsContent value="documentos">
          <DriverTabDocumentos driverId={driver.id} />
        </TabsContent>
        <TabsContent value="kyc">
          <DriverTabKyc driverId={driver.id} />
        </TabsContent>
        <TabsContent value="viajes">
          <DriverTabViajes driverId={driver.id} />
        </TabsContent>
        <TabsContent value="ubicacion">
          <DriverTabUbicacion driverId={driver.id} />
        </TabsContent>
      </Tabs>

      {/* Edit drawer */}
      <DriverFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={driver}
        onSuccess={() => { void refetch(); setEditOpen(false); }}
      />
    </div>
  );
}
