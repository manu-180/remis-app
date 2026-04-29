'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  MapPin,
  Flag,
  Calendar,
  User,
  Car,
  CreditCard,
  Star,
  XCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageBack } from '@/components/admin/page-back';
import { toast } from '@/components/ui/use-toast';
import { formatARS, formatDateShort, relativeTime, initials } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { mapRideStatus } from './rides-list-client';
import { RouteMap } from './route-map';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type RideEvent = {
  id: string;
  from_status: string | null;
  to_status: string | null;
  actor_id: string | null;
  actor_role: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type Payment = {
  id: string;
  method: string | null;
  amount_ars: number | null;
  status: string | null;
  mp_payment_id: string | null;
  paid_at: string | null;
};

type Rating = {
  id: string;
  stars: number | null;
  comment: string | null;
};

type Message = {
  id: string;
  sender_id: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string | null;
};

type RideDetail = {
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
  notes: string | null;
  route_geometry: unknown;
  pickup_location: unknown;
  dest_location: unknown;
  requested_via: string | null;
  vehicle_type_requested: string | null;
  passenger_count: number | null;
  passengers: {
    id: string;
    profiles: Profile | null;
  } | null;
  drivers: {
    id: string;
    is_active: boolean | null;
    current_status: string | null;
    rating: number | null;
    total_rides: number | null;
    profiles: Profile | null;
    vehicles: {
      plate: string | null;
      make: string | null;
      model: string | null;
      color: string | null;
      vehicle_type: string | null;
    } | null;
  } | null;
  ride_events: RideEvent[];
  payments: Payment[];
  ride_ratings: Rating[];
  messages: Message[];
};

// ---------------------------------------------------------------------------
// Status timeline config
// ---------------------------------------------------------------------------
const statusConfig: Record<string, { color: string; label: string }> = {
  requested:              { color: 'var(--neutral-400)',   label: 'Solicitado' },
  assigned:               { color: 'var(--info)',          label: 'Asignado' },
  en_route_to_pickup:     { color: 'var(--warning)',       label: 'En camino' },
  waiting_passenger:      { color: 'var(--warning)',       label: 'Esperando pasajero' },
  on_trip:                { color: 'var(--brand-primary)', label: 'En viaje' },
  completed:              { color: 'var(--success)',       label: 'Completado' },
  cancelled_by_passenger: { color: 'var(--danger)',        label: 'Cancelado por pasajero' },
  cancelled_by_driver:    { color: 'var(--danger)',        label: 'Cancelado por conductor' },
  cancelled_by_dispatcher:{ color: 'var(--danger)',        label: 'Cancelado por operador' },
  no_show:                { color: 'var(--danger)',        label: 'No-show' },
};

const ACTIVE_STATUSES = ['requested', 'assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseGeoPoint(geo: unknown): { lat: number; lng: number } | null {
  if (!geo) return null;
  try {
    const g = typeof geo === 'string' ? JSON.parse(geo) : geo;
    if (g && g.type === 'Point' && Array.isArray(g.coordinates)) {
      return { lng: g.coordinates[0] as number, lat: g.coordinates[1] as number };
    }
  } catch { /* ignore */ }
  return null;
}

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case 'cash':        return 'Efectivo';
    case 'mp_checkout': return 'Mercado Pago';
    case 'account':     return 'Cuenta corriente';
    default:            return method ?? '—';
  }
}

function actorRoleLabel(role: string | null): string {
  switch (role) {
    case 'driver':     return 'Conductor';
    case 'passenger':  return 'Pasajero';
    case 'dispatcher': return 'Operador';
    case 'system':     return 'Sistema';
    default:           return role ?? 'Desconocido';
  }
}

// ---------------------------------------------------------------------------
// Avatar mini
// ---------------------------------------------------------------------------
function AvatarMini({ src, name }: { src: string | null; name: string }) {
  const ini = initials(name);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="h-8 w-8 rounded-full object-cover shrink-0" />
  ) : (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--neutral-0)] text-[10px] font-semibold"
    >
      {ini}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Timeline event row
// ---------------------------------------------------------------------------
function TimelineEvent({ event, isLast }: { event: RideEvent; isLast: boolean }) {
  const [metaOpen, setMetaOpen] = useState(false);
  const toConfig = statusConfig[event.to_status ?? ''] ?? { color: 'var(--neutral-400)', label: event.to_status ?? '?' };
  const fromConfig = statusConfig[event.from_status ?? ''] ?? { color: 'var(--neutral-400)', label: event.from_status ?? '—' };
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className="h-3 w-3 rounded-full shrink-0 mt-1 ring-2 ring-[var(--neutral-0)]"
          style={{ background: toConfig.color }}
        />
        {!isLast && <div className="w-px flex-1 mt-1 bg-[var(--neutral-200)]" />}
      </div>

      {/* Content */}
      <div className={cn('pb-6 min-w-0 flex-1', isLast && 'pb-0')}>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <span className="text-xs text-[var(--neutral-500)] whitespace-nowrap">
            {event.created_at ? formatDateShort(event.created_at) : '—'}
          </span>
          {event.actor_role && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--neutral-100)] text-[var(--neutral-600)]"
            >
              {actorRoleLabel(event.actor_role)}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--neutral-900)] mt-0.5">
          <span style={{ color: fromConfig.color }}>{fromConfig.label}</span>
          {' → '}
          <span style={{ color: toConfig.color }} className="font-medium">{toConfig.label}</span>
        </p>
        {hasMetadata && (
          <div className="mt-1">
            <button
              className="flex items-center gap-1 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-900)] transition-colors"
              onClick={() => setMetaOpen((o) => !o)}
              type="button"
            >
              {metaOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Metadatos
            </button>
            {metaOpen && (
              <pre className="mt-1 text-[11px] bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-[var(--radius-md)] p-2 overflow-x-auto text-[var(--neutral-700)]">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cancel dialog
// ---------------------------------------------------------------------------
function CancelDialog({
  rideId,
  open,
  onOpenChange,
  onSuccess,
}: {
  rideId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!reason.trim()) {
      toast.error('Ingresá un motivo de cancelación.');
      return;
    }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.rpc('cancel_ride', {
        p_ride_id: rideId,
        p_actor_id: user?.id ?? null,
        p_reason: reason.trim(),
      });
      if (error) {
        toast.error(`Error al cancelar: ${String(error.message)}`);
      } else {
        toast.success('Viaje cancelado.');
        onOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      toast.error(`Error inesperado: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--neutral-0)] border-[var(--neutral-200)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--neutral-900)]">
            Cancelar viaje
          </DialogTitle>
          <DialogDescription className="text-[var(--neutral-600)]">
            Esta acción notificará al pasajero y al conductor. Ingresá el motivo.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className={cn(
            'w-full rounded-[var(--radius-md)] border border-[var(--neutral-300)]',
            'bg-[var(--neutral-0)] text-[var(--neutral-900)] text-sm',
            'px-3 py-2 placeholder:text-[var(--neutral-400)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]',
            'resize-none',
          )}
          rows={4}
          placeholder="Motivo de cancelación..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Cancelando...' : 'Confirmar cancelación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function RideDetailClient({ rideId }: { rideId: string }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: ride, isLoading, error, refetch } = useSupabaseQuery<RideDetail>(
    ['ride-detail', rideId],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: qError } = await (sb as any)
        .from('rides')
        .select(`
          *,
          passengers!rides_passenger_id_fkey(
            id, profiles!inner(full_name, phone, avatar_url)
          ),
          drivers!rides_driver_id_fkey(
            id, is_active, current_status, rating, total_rides,
            profiles!inner(full_name, phone, avatar_url),
            vehicles(plate, make, model, color, vehicle_type)
          ),
          ride_events(id, from_status, to_status, actor_id, actor_role, metadata, created_at),
          payments(id, method, amount_ars, status, mp_payment_id, paid_at),
          ride_ratings(id, stars, comment),
          messages(id, sender_id, body, read_at, created_at)
        `)
        .eq('id', rideId)
        .single();
      return { data: data as RideDetail | null, error: qError };
    },
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="p-6 lg:p-8">
        <PageBack href="/admin/rides">Viajes</PageBack>
        <p className="mt-4 text-sm text-[var(--danger)]">
          {error ? error.message : 'Viaje no encontrado.'}
        </p>
      </div>
    );
  }

  const statusInfo = mapRideStatus(ride.status);
  const isActive = ACTIVE_STATUSES.includes(ride.status);
  const fare = ride.final_fare_ars ?? ride.estimated_fare_ars;
  const pickupPoint = parseGeoPoint(ride.pickup_location);
  const destPoint = parseGeoPoint(ride.dest_location);
  const sortedEvents = [...(ride.ride_events ?? [])].sort(
    (a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime(),
  );
  const sortedMessages = [...(ride.messages ?? [])].sort(
    (a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime(),
  );
  const passengerId = ride.passengers?.id;
  const rating = ride.ride_ratings?.[0];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageBack href="/admin/rides">Viajes</PageBack>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Card variant="glass" className="relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--brand-primary) 8%, transparent), transparent)',
          }}
        />
        <CardContent className="relative pt-6">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            {/* ID + status */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusPill variant={statusInfo.variant} label={statusInfo.label} pulse={isActive} />
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-semibold text-[var(--neutral-700)]">
                  #{ride.id.slice(0, 8).toUpperCase()}
                </span>
                <button
                  type="button"
                  className="text-[var(--neutral-400)] hover:text-[var(--neutral-700)] transition-colors"
                  title="Copiar ID completo"
                  onClick={() => {
                    void navigator.clipboard.writeText(ride.id);
                    toast.info('ID copiado.');
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Actions */}
            {isActive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle size={15} className="mr-1.5" />
                Cancelar viaje
              </Button>
            )}
          </div>

          {/* Addresses */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
              <div>
                <p className="text-xs text-[var(--neutral-500)]">Origen</p>
                <p className="text-sm font-medium text-[var(--neutral-900)]">
                  {ride.pickup_address ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Flag size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
              <div>
                <p className="text-xs text-[var(--neutral-500)]">Destino</p>
                <p className="text-sm font-medium text-[var(--neutral-900)]">
                  {ride.dest_address ?? '—'}
                </p>
              </div>
            </div>
            {ride.requested_at && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="shrink-0 text-[var(--neutral-400)]" />
                <p className="text-sm text-[var(--neutral-600)]">
                  {formatDateShort(ride.requested_at)}{' '}
                  <span className="text-[var(--neutral-400)]">
                    ({relativeTime(ride.requested_at)})
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: map */}
        <div className="lg:col-span-2">
          {pickupPoint ? (
            <RouteMap
              pickupLat={pickupPoint.lat}
              pickupLng={pickupPoint.lng}
              {...(destPoint ? { destLat: destPoint.lat, destLng: destPoint.lng } : {})}
              routeGeometry={ride.route_geometry as string | object | null | undefined}
            />
          ) : (
            <div className="h-[400px] rounded-[var(--radius-lg)] border border-[var(--neutral-200)] flex items-center justify-center text-sm text-[var(--neutral-500)] bg-[var(--neutral-50)]">
              Coordenadas no disponibles
            </div>
          )}
        </div>

        {/* Right: info cards */}
        <div className="space-y-4">
          {/* Pasajero */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User size={15} className="text-[var(--neutral-400)]" />
                Pasajero
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {ride.passengers?.profiles ? (
                <div className="flex items-center gap-3">
                  <AvatarMini
                    src={ride.passengers.profiles.avatar_url}
                    name={ride.passengers.profiles.full_name ?? '—'}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--neutral-900)] truncate">
                      {ride.passengers.profiles.full_name ?? '—'}
                    </p>
                    {ride.passengers.profiles.phone && (
                      <p className="text-xs text-[var(--neutral-500)]">
                        {ride.passengers.profiles.phone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--neutral-400)]">Sin datos</p>
              )}
            </CardContent>
          </Card>

          {/* Conductor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Car size={15} className="text-[var(--neutral-400)]" />
                Conductor
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {ride.drivers?.profiles ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <AvatarMini
                      src={ride.drivers.profiles.avatar_url}
                      name={ride.drivers.profiles.full_name ?? '—'}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--neutral-900)] truncate">
                        {ride.drivers.profiles.full_name ?? '—'}
                      </p>
                      {ride.drivers.profiles.phone && (
                        <p className="text-xs text-[var(--neutral-500)]">
                          {ride.drivers.profiles.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {ride.drivers.rating != null && (
                    <p className="text-xs text-[var(--neutral-500)]">
                      ★ {Number(ride.drivers.rating).toFixed(1)} · {ride.drivers.total_rides ?? 0} viajes
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--neutral-400)]">Sin asignar</p>
              )}
            </CardContent>
          </Card>

          {/* Vehículo */}
          {ride.drivers?.vehicles && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Car size={15} className="text-[var(--neutral-400)]" />
                  Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {ride.drivers.vehicles.plate && (
                  <p className="font-mono text-sm font-semibold text-[var(--neutral-900)]">
                    {ride.drivers.vehicles.plate}
                  </p>
                )}
                <p className="text-sm text-[var(--neutral-600)]">
                  {[
                    ride.drivers.vehicles.make,
                    ride.drivers.vehicles.model,
                    ride.drivers.vehicles.color,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                {ride.drivers.vehicles.vehicle_type && (
                  <p className="text-xs text-[var(--neutral-500)]">
                    {ride.drivers.vehicles.vehicle_type}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pago */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard size={15} className="text-[var(--neutral-400)]" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              <p className="text-xl font-bold tabular-nums text-[var(--neutral-900)]">
                {fare != null ? formatARS(fare) : '—'}
              </p>
              <p className="text-sm text-[var(--neutral-600)]">
                {paymentMethodLabel(ride.payment_method)}
              </p>
              {ride.payment_status && (
                <p className="text-xs text-[var(--neutral-500)]">
                  Estado: {ride.payment_status}
                </p>
              )}
              {/* Payment record */}
              {ride.payments?.[0] && (
                <div className="mt-2 pt-2 border-t border-[var(--neutral-100)] space-y-0.5">
                  {ride.payments[0].paid_at && (
                    <p className="text-xs text-[var(--neutral-500)]">
                      Pagado: {formatDateShort(ride.payments[0].paid_at)}
                    </p>
                  )}
                  {ride.payments[0].mp_payment_id && (
                    <p className="text-xs font-mono text-[var(--neutral-500)] truncate">
                      MP ID: {ride.payments[0].mp_payment_id}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating */}
          {rating && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Star size={15} className="text-[var(--neutral-400)]" />
                  Calificación
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < (rating.stars ?? 0)
                          ? 'fill-[var(--warning)] text-[var(--warning)]'
                          : 'text-[var(--neutral-300)]'
                      }
                    />
                  ))}
                  <span className="ml-1 text-sm font-semibold text-[var(--neutral-900)]">
                    {rating.stars ?? '—'}
                  </span>
                </div>
                {rating.comment && (
                  <p className="mt-1.5 text-sm text-[var(--neutral-600)] italic">
                    &ldquo;{rating.comment}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-[var(--neutral-400)]">Sin eventos registrados.</p>
          ) : (
            <div className="ml-1">
              {sortedEvents.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={index === sortedEvents.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--neutral-400)]" />
            Mensajes del viaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMessages.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--neutral-500)]">
              No hubo mensajes en este viaje
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {sortedMessages.map((msg) => {
                const isPassenger = msg.sender_id === passengerId;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2', isPassenger ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-[var(--radius-lg)] px-3 py-2 text-sm',
                        isPassenger
                          ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                          : 'bg-[var(--neutral-100)] text-[var(--neutral-900)] rounded-bl-sm',
                      )}
                    >
                      <p>{msg.body}</p>
                      {msg.created_at && (
                        <p
                          className={cn(
                            'mt-0.5 text-[10px] text-right',
                            isPassenger ? 'text-white/60' : 'text-[var(--neutral-400)]',
                          )}
                        >
                          {formatDateShort(msg.created_at)}
                          {msg.read_at && isPassenger && ' · ✓'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel dialog */}
      <CancelDialog
        rideId={rideId}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSuccess={() => router.push('/admin/rides')}
      />
    </div>
  );
}
