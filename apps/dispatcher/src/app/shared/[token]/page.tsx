export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SharedTripClient, type SharedTrip } from './shared-trip-client';

const sharedTripSchema = z.object({
  ride_id: z.string(),
  status: z.string(),
  driver_id: z.string().nullable(),
  driver_first_name: z.string().nullable(),
  driver_mobile: z.string().nullable(),
  vehicle_plate: z.string().nullable(),
  vehicle_make: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  vehicle_color: z.string().nullable(),
  pickup_address: z.string().nullable(),
  pickup_lat: z.number().nullable(),
  pickup_lng: z.number().nullable(),
  dest_address: z.string().nullable(),
  dest_lat: z.number().nullable(),
  dest_lng: z.number().nullable(),
  started_at: z.string().nullable(),
  requested_at: z.string().nullable(),
  driver_lat: z.number().nullable(),
  driver_lng: z.number().nullable(),
  driver_heading: z.number().nullable(),
  expires_at: z.string().nullable(),
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Segui tu remis en vivo - RemisDespacho',
    description: 'Mira la ubicacion de tu remis en tiempo real.',
    robots: { index: false, follow: false },
    openGraph: {
      title: 'Tu remis en camino',
      description: 'Segui en vivo la ubicacion del conductor.',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: 'Tu remis en camino',
      description: 'Segui en vivo la ubicacion del conductor.',
    },
  };
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();

  let trip: SharedTrip | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_shared_trip', { p_token: token });
    if (error || !data) {
      notFound();
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      notFound();
    }
    const parsed = sharedTripSchema.safeParse(row);
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

  return <SharedTripClient initialTrip={trip} token={token} />;
}
