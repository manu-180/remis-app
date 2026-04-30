'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
  ChevronRight,
  MessageSquare,
  UserPlus,
  UserX,
  Share2,
  Send,
  Link as LinkIcon,
  RefreshCw,
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
  passenger_id: string | null;
  driver_id: string | null;
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

type SharedTripRow = {
  token: string;
  expires_at: string;
  created_at: string;
};

type AvailableDriver = {
  driver_id: string;
  full_name: string | null;
  rating: number | null;
  distance_m: number | null;
  vehicle_type: string | null;
  plate: string | null;
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
const REASSIGNABLE_STATUSES = ['assigned', 'en_route_to_pickup', 'waiting_passenger'];
const SHAREABLE_STATUSES = ['assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip'];

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

function formatDistance(m: number | null): string {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatExpiresIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `en ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `en ${hrs} h`;
  return `en ${Math.round(hrs / 24)} d`;
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
        setReason('');
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
// Reassign dialog
// ---------------------------------------------------------------------------
function ReassignDialog({
  ride,
  open,
  onOpenChange,
  onSuccess,
}: {
  ride: RideDetail;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [drivers, setDrivers] = useState<AvailableDriver[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pickup = parseGeoPoint(ride.pickup_location);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setReason('');

    void (async () => {
      setLoadingList(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = getSupabaseBrowserClient() as any;
        if (pickup) {
          const { data, error } = await sb.rpc('find_nearest_available_drivers', {
            pickup_lat: pickup.lat,
            pickup_lng: pickup.lng,
            max_distance_m: 50000,
            limit_count: 20,
            p_vehicle_type: ride.vehicle_type_requested ?? null,
          });
          if (error) throw error;
          const filtered = (data as AvailableDriver[]).filter((d) => d.driver_id !== ride.driver_id);
          setDrivers(filtered);
        } else {
          // Fallback sin pickup: query directa
          const { data, error } = await sb
            .from('drivers')
            .select('id, rating, profiles!inner(full_name), vehicles(vehicle_type, plate)')
            .eq('is_active', true)
            .eq('current_status', 'available')
            .limit(20);
          if (error) throw error;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped = (data ?? []).map((d: any) => ({
            driver_id: d.id,
            full_name: d.profiles?.full_name ?? null,
            rating: d.rating,
            distance_m: null,
            vehicle_type: d.vehicles?.vehicle_type ?? null,
            plate: d.vehicles?.plate ?? null,
          })).filter((d: AvailableDriver) => d.driver_id !== ride.driver_id);
          setDrivers(mapped);
        }
      } catch (err) {
        toast.error(`Error cargando conductores: ${String((err as Error).message ?? err)}`);
        setDrivers([]);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [open, ride.id, ride.driver_id, ride.vehicle_type_requested, pickup?.lat, pickup?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.rpc('reassign_ride', {
        p_ride_id: ride.id,
        p_new_driver_id: selectedId,
        p_dispatcher_id: user?.id ?? null,
        p_reason: reason.trim() || null,
      });
      if (error) {
        toast.error(`Error al reasignar: ${String(error.message)}`);
      } else {
        toast.success('Conductor reasignado.');
        onOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      toast.error(`Error inesperado: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[var(--neutral-0)] border-[var(--neutral-200)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--neutral-900)]">Reasignar conductor</DialogTitle>
          <DialogDescription className="text-[var(--neutral-600)]">
            El conductor actual quedará disponible y se asignará el nuevo.
            {ride.vehicle_type_requested && (
              <span className="block mt-1 text-xs">
                Tipo de vehículo solicitado: <span className="font-semibold">{ride.vehicle_type_requested}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Lista */}
        <div className="max-h-[360px] overflow-y-auto -mx-6 px-6 border-y border-[var(--neutral-100)]">
          {loadingList ? (
            <div className="space-y-2 py-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : drivers && drivers.length > 0 ? (
            <ul className="divide-y divide-[var(--neutral-100)]">
              {drivers.map((d) => {
                const selected = selectedId === d.driver_id;
                return (
                  <li key={d.driver_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.driver_id)}
                      className={cn(
                        'w-full flex items-center gap-3 py-3 px-2 text-left transition-colors',
                        selected
                          ? 'bg-[var(--brand-primary)]/10 ring-1 ring-[var(--brand-primary)]/40'
                          : 'hover:bg-[var(--neutral-50)]',
                      )}
                    >
                      <AvatarMini src={null} name={d.full_name ?? '—'} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--neutral-900)] truncate">
                          {d.full_name ?? '—'}
                        </p>
                        <p className="text-xs text-[var(--neutral-500)]">
                          {[d.plate, d.vehicle_type].filter(Boolean).join(' · ') || 'Sin vehículo'}
                          {d.rating != null && ` · ★ ${Number(d.rating).toFixed(1)}`}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--neutral-500)] tabular-nums shrink-0">
                        {formatDistance(d.distance_m)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--neutral-500)]">
              No hay conductores disponibles.
            </p>
          )}
        </div>

        {/* Motivo */}
        <textarea
          className={cn(
            'w-full rounded-[var(--radius-md)] border border-[var(--neutral-300)]',
            'bg-[var(--neutral-0)] text-[var(--neutral-900)] text-sm',
            'px-3 py-2 placeholder:text-[var(--neutral-400)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]',
            'resize-none',
          )}
          rows={2}
          placeholder="Motivo (opcional)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!selectedId || submitting}>
            {submitting ? 'Reasignando...' : 'Reasignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared trip section
// ---------------------------------------------------------------------------
function SharedTripSection({ rideId }: { rideId: string }) {
  const [shared, setShared] = useState<SharedTripRow | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function fetchActive() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabaseBrowserClient() as any;
    const { data, error } = await sb
      .from('shared_trips')
      .select('token, expires_at, created_at')
      .eq('ride_id', rideId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error(`Error cargando link: ${String(error.message)}`);
      setShared(null);
      return;
    }
    setShared((data as SharedTripRow | null) ?? null);
  }

  useEffect(() => {
    void fetchActive();
  }, [rideId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.rpc('create_shared_trip', {
        p_ride_id: rideId,
        p_user_id: user?.id ?? null,
      });
      if (error) {
        toast.error(`Error generando link: ${String(error.message)}`);
      } else {
        toast.success('Link generado.');
        await fetchActive();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!shared) return;
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { error } = await sb
        .from('shared_trips')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token', shared.token);
      if (error) {
        toast.error(`Error revocando: ${String(error.message)}`);
      } else {
        toast.success('Link revocado.');
        setShared(null);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!shared) return;
    const url = `${origin}/shared/${shared.token}`;
    void navigator.clipboard.writeText(url);
    toast.info('Link copiado.');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Share2 size={15} className="text-[var(--neutral-400)]" />
          Vista pública
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {shared === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : shared ? (
          <>
            <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2.5 py-2">
              <p className="text-[11px] text-[var(--neutral-500)]">URL pública</p>
              <p className="font-mono text-xs text-[var(--neutral-900)] truncate" title={`${origin}/shared/${shared.token}`}>
                /shared/{shared.token.slice(0, 8)}…
              </p>
            </div>
            <p className="text-xs text-[var(--neutral-500)]">
              Expira {formatExpiresIn(shared.expires_at)}
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
                <LinkIcon size={14} className="mr-1.5" />
                Copiar link
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={handleRevoke} disabled={busy}>
                Revocar link
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--neutral-500)]">
              Generá un link compartible para que el pasajero o un familiar pueda ver el viaje en vivo.
            </p>
            <Button type="button" size="sm" onClick={handleGenerate} disabled={busy} className="w-full">
              <Share2 size={14} className="mr-1.5" />
              {busy ? 'Generando...' : 'Generar link compartido'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Messages thread (with input + realtime)
// ---------------------------------------------------------------------------
function MessagesThread({
  rideId,
  initialMessages,
  passengerId,
  driverId,
  canSend,
}: {
  rideId: string;
  initialMessages: Message[];
  passengerId: string | null | undefined;
  driverId: string | null | undefined;
  canSend: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial messages when ride refetches
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Get current user id
  useEffect(() => {
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { data: { user } } = await sb.auth.getUser();
      setMeId(user?.id ?? null);
    })();
  }, []);

  // Realtime subscribe
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabaseBrowserClient() as any;
    const channel = sb
      .channel(`messages-${rideId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `ride_id=eq.${rideId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `ride_id=eq.${rideId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((p) => (p.id === m.id ? m : p)));
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [rideId]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sortedMessages = useMemo(
    () => [...messages].sort(
      (a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime(),
    ),
    [messages],
  );

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;
    if (text.length > 2000) {
      toast.error('Máximo 2000 caracteres.');
      return;
    }
    setSending(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        toast.error('Sesión expirada.');
        return;
      }
      const { error } = await sb.from('messages').insert({
        ride_id: rideId,
        sender_id: user.id,
        body: text,
      });
      if (error) {
        toast.error(`No se pudo enviar: ${String(error.message)}`);
      } else {
        setBody('');
      }
    } finally {
      setSending(false);
    }
  }

  function senderLabel(senderId: string | null): string {
    if (!senderId) return 'Sistema';
    if (senderId === meId) return 'Vos';
    if (senderId === passengerId) return 'Pasajero';
    if (senderId === driverId) return 'Conductor';
    return 'Operador';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare size={16} className="text-[var(--neutral-400)]" />
          Mensajes del viaje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollerRef}
          className="space-y-3 max-h-[400px] min-h-[120px] overflow-y-auto pr-1"
        >
          {sortedMessages.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--neutral-500)]">
              No hubo mensajes en este viaje
            </div>
          ) : (
            sortedMessages.map((msg) => {
              const mine = meId != null && msg.sender_id === meId;
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-[var(--radius-lg)] px-3 py-2 text-sm',
                      mine
                        ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                        : 'bg-[var(--neutral-100)] text-[var(--neutral-900)] rounded-bl-sm',
                    )}
                  >
                    <p
                      className={cn(
                        'text-[10px] mb-0.5',
                        mine ? 'text-white/70' : 'text-[var(--neutral-500)]',
                      )}
                    >
                      {senderLabel(msg.sender_id)}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    {msg.created_at && (
                      <p
                        className={cn(
                          'mt-0.5 text-[10px] text-right',
                          mine ? 'text-white/60' : 'text-[var(--neutral-400)]',
                        )}
                      >
                        {formatDateShort(msg.created_at)}
                        {msg.read_at && mine && ' · ✓'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        {canSend ? (
          <div className="mt-4 flex gap-2 items-end">
            <textarea
              className={cn(
                'flex-1 rounded-[var(--radius-md)] border border-[var(--neutral-300)]',
                'bg-[var(--neutral-0)] text-[var(--neutral-900)] text-sm',
                'px-3 py-2 placeholder:text-[var(--neutral-400)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]',
                'resize-none',
              )}
              rows={2}
              maxLength={2000}
              placeholder="Escribir mensaje..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={sending}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="shrink-0"
            >
              <Send size={14} className="mr-1.5" />
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--neutral-500)] italic">
            El chat está cerrado: el viaje ya no está activo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function RideDetailClient({ rideId }: { rideId: string }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [noShowBusy, setNoShowBusy] = useState(false);

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

  async function handleNoShow() {
    if (!ride) return;
    if (!confirm('¿Confirmás marcar al pasajero como no-show?')) return;
    setNoShowBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabaseBrowserClient() as any;
      const { data: { user } } = await sb.auth.getUser();
      const { error: rpcErr } = await sb.rpc('mark_ride_no_show', {
        p_ride_id: ride.id,
        p_actor_id: user?.id ?? null,
      });
      if (rpcErr) {
        toast.error(`Error: ${String(rpcErr.message)}`);
      } else {
        toast.success('Marcado como no-show.');
        await refetch();
      }
    } finally {
      setNoShowBusy(false);
    }
  }

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
  const canReassign = REASSIGNABLE_STATUSES.includes(ride.status);
  const canShare = SHAREABLE_STATUSES.includes(ride.status);
  const canSendMessages = isActive;
  const canMarkNoShow = ride.status === 'waiting_passenger';
  const fare = ride.final_fare_ars ?? ride.estimated_fare_ars;
  const pickupPoint = parseGeoPoint(ride.pickup_location);
  const destPoint = parseGeoPoint(ride.dest_location);
  const sortedEvents = [...(ride.ride_events ?? [])].sort(
    (a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime(),
  );
  const passengerId = ride.passengers?.id ?? ride.passenger_id ?? null;
  const driverPid = ride.drivers?.id ?? ride.driver_id ?? null;
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void refetch()}
                title="Refrescar"
              >
                <RefreshCw size={14} />
              </Button>
              {canReassign && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReassignOpen(true)}
                >
                  <UserPlus size={15} className="mr-1.5" />
                  Reasignar conductor
                </Button>
              )}
              {canMarkNoShow && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleNoShow}
                  disabled={noShowBusy}
                >
                  <UserX size={15} className="mr-1.5" />
                  {noShowBusy ? 'Marcando...' : 'Marcar no-show'}
                </Button>
              )}
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
          {driverPid ? (
            <Link
              href={`/admin/drivers/${driverPid}`}
              className="block rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
            >
              <Card className="cursor-pointer transition-colors hover:bg-[var(--neutral-50)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Car size={15} className="text-[var(--neutral-400)]" />
                      Conductor
                    </span>
                    <ChevronRight size={14} className="text-[var(--neutral-400)]" />
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
                    <p className="text-sm text-[var(--neutral-400)]">Sin datos</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Car size={15} className="text-[var(--neutral-400)]" />
                  Conductor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-[var(--neutral-400)]">Sin asignar</p>
              </CardContent>
            </Card>
          )}

          {/* Vehículo */}
          {ride.drivers?.vehicles && driverPid && (
            <Link
              href={`/admin/drivers/${driverPid}?tab=vehicle`}
              className="block rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
            >
              <Card className="cursor-pointer transition-colors hover:bg-[var(--neutral-50)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Car size={15} className="text-[var(--neutral-400)]" />
                      Vehículo
                    </span>
                    <ChevronRight size={14} className="text-[var(--neutral-400)]" />
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
            </Link>
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

          {/* Compartir viaje */}
          {canShare && <SharedTripSection rideId={ride.id} />}

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
      <MessagesThread
        rideId={ride.id}
        initialMessages={ride.messages ?? []}
        passengerId={passengerId}
        driverId={driverPid}
        canSend={canSendMessages}
      />

      {/* Cancel dialog */}
      <CancelDialog
        rideId={rideId}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSuccess={() => void refetch()}
      />

      {/* Reassign dialog */}
      <ReassignDialog
        ride={ride}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
