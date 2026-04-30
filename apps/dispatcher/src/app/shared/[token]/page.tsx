export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

const sharedTripSchema = z.object({
  ride_id: z.string(),
  status: z.string(),
  pickup_address: z.string().nullable(),
  dest_address: z.string().nullable(),
  driver_name: z.string().nullable(),
  driver_avatar_url: z.string().nullable(),
  vehicle_plate: z.string().nullable(),
  vehicle_make: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  driver_rating: z.number().nullable(),
  eta_minutes: z.number().nullable(),
  shared_by_name: z.string().nullable(),
});

type SharedTrip = z.infer<typeof sharedTripSchema>;

export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();

  let trip: SharedTrip | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_shared_trip', { p_token: token });
    if (error || !data) {
      notFound();
    }
    const parsed = sharedTripSchema.safeParse(data);
    if (!parsed.success) {
      console.error('[shared-trip] shape inesperado:', parsed.error.flatten());
      notFound();
    }
    trip = parsed.data;
  } catch {
    notFound();
  }

  if (!trip) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--neutral-50)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--neutral-0)] border-b border-[var(--neutral-200)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
            <span className="text-white text-xs font-bold">R</span>
          </div>
          <span className="font-semibold text-[var(--neutral-900)]">RemisDespacho</span>
        </div>
        <span className="text-sm text-[var(--neutral-500)]">
          Compartido por {trip.shared_by_name ?? 'un pasajero'}
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        {/* Status card */}
        <div className="bg-[var(--neutral-0)] rounded-[var(--radius-lg)] border border-[var(--neutral-200)] p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--neutral-500)] mb-1">Estado del viaje</p>
              <p className="text-lg font-semibold text-[var(--neutral-900)]">{formatStatus(trip.status)}</p>
            </div>
            {trip.eta_minutes != null && trip.status === 'en_route_to_pickup' && (
              <div className="text-right">
                <p className="text-xs text-[var(--neutral-500)]">ETA</p>
                <p className="text-xl font-bold text-[var(--brand-accent)]">{trip.eta_minutes} min</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-[var(--success)] shrink-0" />
              <div>
                <p className="text-xs text-[var(--neutral-500)]">Origen</p>
                <p className="text-sm text-[var(--neutral-800)]">{trip.pickup_address ?? '—'}</p>
              </div>
            </div>
            <div className="ml-1 w-0.5 h-4 bg-[var(--neutral-200)]" />
            <div className="flex items-start gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-[var(--danger)] shrink-0" />
              <div>
                <p className="text-xs text-[var(--neutral-500)]">Destino</p>
                <p className="text-sm text-[var(--neutral-800)]">{trip.dest_address ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver card */}
        {trip.driver_name && (
          <div className="bg-[var(--neutral-0)] rounded-[var(--radius-lg)] border border-[var(--neutral-200)] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--neutral-500)] mb-4">Tu conductor</p>
            <div className="flex items-center gap-4">
              {trip.driver_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.driver_avatar_url} alt={trip.driver_name} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[var(--neutral-200)] flex items-center justify-center text-[var(--neutral-500)] text-lg font-bold">
                  {trip.driver_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-[var(--neutral-900)]">{trip.driver_name}</p>
                {trip.vehicle_make && (
                  <p className="text-sm text-[var(--neutral-500)]">
                    {trip.vehicle_make} {trip.vehicle_model} · {trip.vehicle_plate}
                  </p>
                )}
                {trip.driver_rating != null && (
                  <p className="text-sm text-[var(--neutral-500)]">★ {Number(trip.driver_rating).toFixed(1)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-[var(--neutral-400)]">
        Powered by RemisDespacho
      </footer>
    </div>
  );
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Esperando conductor',
    assigned: 'Conductor asignado',
    en_route_to_pickup: 'Conductor en camino',
    waiting_passenger: 'Conductor esperando',
    on_trip: 'En viaje',
    completed: 'Viaje completado',
    cancelled_by_passenger: 'Cancelado',
    cancelled_by_driver: 'Cancelado',
  };
  return map[status] ?? status;
}
