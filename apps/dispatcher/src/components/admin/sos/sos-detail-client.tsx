'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertOctagon,
  ArrowLeft,
  Phone,
  CheckCircle2,
  Clock,
  User,
  Car,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { reverseGeocode } from '@/lib/geocode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// Dynamic MapLibre imports (SSR disabled)
// ---------------------------------------------------------------------------
const MapGL = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), { ssr: false });
const Source = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Source), { ssr: false });
const Layer = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Layer), { ssr: false });
const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GeoPoint = { type: 'Point'; coordinates: [number, number] };

type PriorLocation =
  | { lat: number; lng: number }
  | { latitude: number; longitude: number }
  | GeoPoint;

type SosEvent = {
  id: string;
  ride_id: string | null;
  triggered_by: string;
  triggered_role: string;
  location: GeoPoint | null;
  prior_locations: PriorLocation[] | null;
  driver_snapshot: Record<string, unknown> | null;
  passenger_snapshot: Record<string, unknown> | null;
  vehicle_snapshot: Record<string, unknown> | null;
  dispatched_to_dispatcher: boolean | null;
  external_contacts_notified: unknown | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  triggered_profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  resolver: {
    full_name: string | null;
  } | null;
};

type AuditLog = {
  id: string;
  action: string;
  actor_id: string;
  diff: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractCoords(loc: PriorLocation): [number, number] | null {
  if (!loc) return null;
  if ('coordinates' in loc && Array.isArray(loc.coordinates)) {
    return [loc.coordinates[0], loc.coordinates[1]]; // [lng, lat]
  }
  if ('lng' in loc && 'lat' in loc) return [loc.lng, loc.lat];
  if ('longitude' in loc && 'latitude' in loc) return [loc.longitude, loc.latitude];
  return null;
}

function formatDuration(start: string, end: string): string {
  const secs = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// LiveTimer
// ---------------------------------------------------------------------------
function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span
      className="font-mono text-xl tabular-nums px-3 py-1 rounded-full"
      style={{ background: 'rgba(255,255,255,0.20)' }}
    >
      {h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}:${pad(s)}`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pulsing SOS marker
// ---------------------------------------------------------------------------
function SosDot() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
      <span
        className="absolute inline-flex rounded-full opacity-60"
        style={{
          width: 24,
          height: 24,
          background: 'var(--danger)',
          animation: 'pulse-soft 1.5s ease-in-out infinite',
        }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: 12, height: 12, background: 'var(--danger)', border: '2.5px solid white' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SOS Map
// ---------------------------------------------------------------------------
function SosMapInner({
  lng,
  lat,
  priorLocations,
}: {
  lng: number;
  lat: number;
  priorLocations: PriorLocation[] | null;
}) {
  // Build trail GeoJSON from prior_locations
  const trailCoords: [number, number][] = [];
  if (priorLocations && priorLocations.length > 0) {
    for (const loc of priorLocations) {
      const coords = extractCoords(loc);
      if (coords) trailCoords.push(coords);
    }
  }
  trailCoords.push([lng, lat]); // add the SOS point at the end

  const trailData =
    trailCoords.length >= 2
      ? {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: trailCoords,
          },
          properties: {},
        }
      : null;

  return (
    <div className="h-[400px] rounded-[var(--radius-lg)] overflow-hidden">
      <MapGL
        id="sos-map"
        initialViewState={{ longitude: lng, latitude: lat, zoom: 14 }}
        mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Trail polyline */}
        {trailData && (
          <>
            <Source id="sos-trail" type="geojson" data={trailData} />
            <Layer
              id="sos-trail-line"
              source="sos-trail"
              type="line"
              paint={{
                'line-color': '#F97316',
                'line-width': 3,
                'line-opacity': 0.8,
                'line-gradient': [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, '#FBBF24',
                  1, '#DC2626',
                ],
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </>
        )}

        {/* SOS marker */}
        <Marker longitude={lng} latitude={lat} anchor="center">
          <SosDot />
        </Marker>

        {/* Trail start marker (if we have prior locations) */}
        {trailCoords.length >= 2 && trailCoords[0] !== undefined && (
          <Marker longitude={trailCoords[0][0]!} latitude={trailCoords[0][1]!} anchor="center">
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#FBBF24',
                border: '2px solid white',
              }}
            />
          </Marker>
        )}
      </MapGL>
    </div>
  );
}

const SosMap = dynamic(() => Promise.resolve(SosMapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px]" />,
});

// ---------------------------------------------------------------------------
// Snapshot card
// ---------------------------------------------------------------------------
function SnapshotCard({
  title,
  icon,
  data,
}: {
  title: string;
  icon: React.ReactNode;
  data: Record<string, unknown> | null | undefined;
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text-sm)]">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-[var(--text-sm)] text-[var(--neutral-400)]">No disponible</p>
        </CardContent>
      </Card>
    );
  }

  const DISPLAY_KEYS = [
    'full_name', 'name', 'phone', 'email', 'plate', 'make', 'model', 'color', 'year',
    'license_plate', 'rating', 'status', 'id',
  ];
  const entries = Object.entries(data).filter(([k]) => DISPLAY_KEYS.includes(k));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-sm)]">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {entries.length === 0 ? (
          <p className="text-[var(--text-sm)] text-[var(--neutral-400)]">Sin datos</p>
        ) : (
          entries.map(([key, val]) => (
            <div key={key} className="flex items-start justify-between gap-2 text-[var(--text-sm)]">
              <span className="text-[var(--neutral-500)] capitalize shrink-0">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="font-medium text-right truncate max-w-[60%]">
                {String(val ?? '—')}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Timeline entry
// ---------------------------------------------------------------------------
function TimelineEntry({ log }: { log: AuditLog }) {
  const actor = log.profiles?.full_name ?? shortId(log.actor_id);
  const note = log.diff?.note ? String(log.diff.note) : null;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--neutral-100)', color: 'var(--neutral-500)' }}
        >
          {log.action === 'note' ? (
            <MessageSquare size={13} />
          ) : log.action === 'resolve' ? (
            <CheckCircle2 size={13} />
          ) : (
            <Clock size={13} />
          )}
        </div>
        <div className="w-px flex-1 bg-[var(--neutral-200)] mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[var(--text-sm)]">{actor}</span>
          <span className="text-[var(--text-xs)] text-[var(--neutral-500)] capitalize">{log.action}</span>
          <span className="ml-auto text-[var(--text-xs)] text-[var(--neutral-400)]">
            {format(new Date(log.created_at), 'd MMM, HH:mm', { locale: es })}
          </span>
        </div>
        {note && (
          <p className="mt-1 text-[var(--text-sm)] text-[var(--neutral-700)] bg-[var(--neutral-50)] rounded-[var(--radius-md)] px-3 py-2 border border-[var(--neutral-200)]">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface SosDetailClientProps {
  sosId: string;
}

export function SosDetailClient({ sosId }: SosDetailClientProps) {
  const router = useRouter();
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // Main SOS query
  const { data: sos, isLoading, refetch } = useSupabaseQuery<SosEvent>(
    ['sos-detail', sosId],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb as any)
        .from('sos_events')
        .select(
          `*,
          triggered_profile:profiles!sos_events_triggered_by_fkey(full_name, phone, avatar_url),
          resolver:profiles!sos_events_resolved_by_fkey(full_name)`,
        )
        .eq('id', sosId)
        .single();
      return { data, error };
    },
  );

  // Audit log
  const { data: auditLogs, refetch: refetchLogs } = useSupabaseQuery<AuditLog[]>(
    ['sos-audit', sosId],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb as any)
        .from('audit_log')
        .select('*, profiles!audit_log_actor_id_fkey(full_name)')
        .eq('entity_type', 'sos_events')
        .eq('entity_id', sosId)
        .order('created_at', { ascending: true });
      return { data: data ?? [], error };
    },
  );

  // Reverse geocode SOS location
  useEffect(() => {
    if (!sos?.location) return;
    const [lng, lat] = sos.location.coordinates;
    reverseGeocode(lat, lng).then((addr) => {
      if (addr) setAddress(addr);
    });
  }, [sos?.location]);

  // Realtime updates for this SOS
  const supabase = getSupabaseBrowserClient();
  useEffect(() => {
    const channel = supabase
      .channel(`sos-detail-${sosId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'sos_events', filter: `id=eq.${sosId}` },
        () => { refetch(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sosId, supabase, refetch]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleMarkAttending = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('sos_events')
      .update({ dispatched_to_dispatcher: true })
      .eq('id', sosId);
    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success('Marcado como atendiendo');
      refetch();
    }
  };

  const handleResolve = async () => {
    if (!resolveNotes.trim()) return;
    setResolving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('sos_events')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: resolveNotes.trim(),
        })
        .eq('id', sosId);
      if (error) {
        toast.error('Error al resolver el SOS');
      } else {
        toast.success('SOS resuelto correctamente');
        setShowResolveDialog(false);
        router.push('/admin/sos');
      }
    } finally {
      setResolving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('audit_log').insert({
        entity_type: 'sos_events',
        entity_id: sosId,
        action: 'note',
        actor_id: user?.id,
        diff: { note: noteText.trim() },
      });
      if (error) {
        toast.error('Error al guardar la nota');
      } else {
        setNoteText('');
        refetchLogs();
      }
    } finally {
      setAddingNote(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!sos) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-[var(--neutral-500)]">SOS no encontrado.</p>
        <Button variant="ghost" onClick={() => router.push('/admin/sos')} className="mt-4">
          <ArrowLeft size={16} className="mr-1" />
          Volver
        </Button>
      </div>
    );
  }

  const [sosLng, sosLat] = sos.location?.coordinates ?? [0, 0];
  const hasLocation = sos.location != null;
  const isResolved = sos.resolved_at != null;

  // Driver phone from snapshot or triggered profile
  const driverPhone =
    (sos.driver_snapshot?.phone as string | undefined) ??
    (sos.triggered_role === 'driver' ? sos.triggered_profile?.phone : undefined);

  const passengerPhone =
    (sos.passenger_snapshot?.phone as string | undefined) ??
    (sos.triggered_role === 'passenger' ? sos.triggered_profile?.phone : undefined);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/sos')}
        className="flex items-center gap-1.5 text-[var(--neutral-500)] hover:text-[var(--neutral-900)] text-[var(--text-sm)] transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al Centro SOS
      </button>

      {/* Hero */}
      <div
        className="p-6 text-white rounded-[var(--radius-xl)]"
        style={{
          background: isResolved
            ? 'linear-gradient(135deg, var(--success), color-mix(in oklab, var(--success) 70%, black))'
            : 'linear-gradient(135deg, var(--danger), color-mix(in oklab, var(--danger) 80%, black))',
        }}
      >
        <div className="flex items-start gap-4">
          {isResolved ? (
            <CheckCircle2 size={48} className="shrink-0 mt-1 opacity-90" />
          ) : (
            <AlertOctagon size={48} className="shrink-0 mt-1 opacity-90" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold">
                {isResolved ? 'SOS Resuelto' : 'SOS Activo'}
              </h1>
              {!isResolved && <LiveTimer startTime={sos.created_at} />}
            </div>

            <p className="opacity-80 text-sm">
              Disparado por:{' '}
              <strong>{sos.triggered_profile?.full_name ?? 'Desconocido'}</strong>{' '}
              ({sos.triggered_role})
            </p>

            {sos.triggered_profile?.phone && (
              <a
                href={`tel:${sos.triggered_profile.phone}`}
                className="underline opacity-90 text-sm mt-0.5 inline-block"
              >
                {sos.triggered_profile.phone}
              </a>
            )}

            <p className="text-xs opacity-60 mt-1">
              {format(new Date(sos.created_at), "d 'de' MMMM yyyy, HH:mm:ss", { locale: es })}
              {sos.ride_id && (
                <> · Viaje #{shortId(sos.ride_id)}</>
              )}
            </p>

            {address && (
              <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                <span>📍</span> {address}
              </p>
            )}

            {isResolved && sos.resolver && (
              <p className="text-sm opacity-80 mt-1">
                Resuelto por <strong>{sos.resolver.full_name}</strong>{' '}
                ({formatDistanceToNow(new Date(sos.resolved_at!), { addSuffix: true, locale: es })})
                {' · '}Tiempo: {formatDuration(sos.created_at, sos.resolved_at!)}
              </p>
            )}

            {isResolved && sos.resolution_notes && (
              <p className="text-sm mt-2 bg-white/10 rounded-lg px-3 py-2">
                &quot;{sos.resolution_notes}&quot;
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-5">
          {!sos.dispatched_to_dispatcher && !isResolved && (
            <Button
              variant="secondary"
              className="h-11 bg-white/20 text-white hover:bg-white/30 border-white/30"
              onClick={handleMarkAttending}
            >
              <Clock size={15} className="mr-1.5" />
              Marcar como atendiendo
            </Button>
          )}

          <Button
            variant="secondary"
            className="h-11 bg-white/20 text-white hover:bg-white/30 border-white/30"
            onClick={() => window.open('tel:911')}
          >
            <Phone size={15} className="mr-1.5" />
            Llamar 911
          </Button>

          {driverPhone && (
            <Button
              variant="secondary"
              className="h-11 bg-white/20 text-white hover:bg-white/30 border-white/30"
              onClick={() => window.open(`tel:${driverPhone}`)}
            >
              <Car size={15} className="mr-1.5" />
              Llamar conductor
            </Button>
          )}

          {passengerPhone && (
            <Button
              variant="secondary"
              className="h-11 bg-white/20 text-white hover:bg-white/30 border-white/30"
              onClick={() => window.open(`tel:${passengerPhone}`)}
            >
              <User size={15} className="mr-1.5" />
              Llamar pasajero
            </Button>
          )}

          {sos.ride_id && (
            <Button
              variant="secondary"
              className="h-11 bg-white/20 text-white hover:bg-white/30 border-white/30"
              onClick={() => router.push(`/admin/rides/${sos.ride_id}`)}
            >
              <ExternalLink size={15} className="mr-1.5" />
              Ver viaje
            </Button>
          )}

          {!isResolved && (
            <Button
              variant="destructive"
              className="h-11 ml-auto"
              onClick={() => setShowResolveDialog(true)}
            >
              <CheckCircle2 size={15} className="mr-1.5" />
              Resolver SOS
            </Button>
          )}
        </div>
      </div>

      {/* Map + Snapshots row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {hasLocation ? (
              <SosMap
                lng={sosLng}
                lat={sosLat}
                priorLocations={sos.prior_locations}
              />
            ) : (
              <div className="h-[400px] rounded-[var(--radius-lg)] flex items-center justify-center bg-[var(--neutral-50)] border border-[var(--neutral-200)]">
                <p className="text-[var(--neutral-400)] text-sm">Ubicación no disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snapshots */}
        <div className="space-y-4">
          <SnapshotCard
            title="Disparado por"
            icon={<User size={15} />}
            data={
              sos.triggered_profile
                ? {
                    full_name: sos.triggered_profile.full_name,
                    phone: sos.triggered_profile.phone,
                    role: sos.triggered_role,
                  }
                : null
            }
          />

          <SnapshotCard
            title="Conductor"
            icon={<User size={15} />}
            data={sos.driver_snapshot}
          />

          <SnapshotCard
            title="Pasajero"
            icon={<User size={15} />}
            data={sos.passenger_snapshot}
          />

          <SnapshotCard
            title="Vehículo"
            icon={<Car size={15} />}
            data={sos.vehicle_snapshot}
          />
        </div>
      </div>

      {/* Timeline + Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={16} />
            Línea de tiempo y notas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Creation entry */}
          <div className="flex gap-3 mb-2">
            <div className="flex flex-col items-center">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
              >
                <AlertOctagon size={13} />
              </div>
              <div className="w-px flex-1 bg-[var(--neutral-200)] mt-1" />
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[var(--text-sm)]">SOS activado</span>
                <span className="text-[var(--text-xs)] text-[var(--neutral-500)] capitalize">
                  {sos.triggered_role}
                </span>
                <span className="ml-auto text-[var(--text-xs)] text-[var(--neutral-400)]">
                  {format(new Date(sos.created_at), 'd MMM, HH:mm:ss', { locale: es })}
                </span>
              </div>
              <p className="text-[var(--text-sm)] text-[var(--neutral-600)]">
                {sos.triggered_profile?.full_name ?? 'Desconocido'}
              </p>
            </div>
          </div>

          {/* Audit log entries */}
          {auditLogs && auditLogs.length > 0
            ? auditLogs.map((log) => <TimelineEntry key={log.id} log={log} />)
            : null}

          {/* Resolution entry */}
          {isResolved && (
            <div className="flex gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                >
                  <CheckCircle2 size={13} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--text-sm)]">SOS resuelto</span>
                  {sos.resolver && (
                    <span className="text-[var(--text-xs)] text-[var(--neutral-500)]">
                      por {sos.resolver.full_name}
                    </span>
                  )}
                  <span className="ml-auto text-[var(--text-xs)] text-[var(--neutral-400)]">
                    {format(new Date(sos.resolved_at!), 'd MMM, HH:mm:ss', { locale: es })}
                  </span>
                </div>
                {sos.resolution_notes && (
                  <p className="mt-1 text-[var(--text-sm)] text-[var(--neutral-700)] bg-[var(--neutral-50)] rounded-[var(--radius-md)] px-3 py-2 border border-[var(--neutral-200)]">
                    {sos.resolution_notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add note */}
          <div className="mt-6 pt-4 border-t border-[var(--neutral-200)] space-y-3">
            <p className="text-[var(--text-sm)] font-medium text-[var(--neutral-700)]">Agregar nota</p>
            <Textarea
              placeholder="Escribir nota sobre este evento..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
            <Button
              variant="secondary"
              disabled={!noteText.trim() || addingNote}
              onClick={handleAddNote}
            >
              {addingNote ? 'Guardando...' : 'Agregar nota'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--success)]" />
              Resolver SOS
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-[var(--text-sm)] text-[var(--neutral-600)]">
              Describí cómo se resolvió la emergencia. Esto quedará registrado en el historial.
            </p>
            <Textarea
              placeholder="Notas de resolución (requerido)"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowResolveDialog(false)}
              disabled={resolving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!resolveNotes.trim() || resolving}
              onClick={handleResolve}
            >
              {resolving ? 'Resolviendo...' : 'Resolver SOS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
