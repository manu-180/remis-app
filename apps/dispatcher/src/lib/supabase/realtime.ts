'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';
import { useDriversStore } from '@/stores/drivers-store';
import type { Driver, DriverPosition } from '@/stores/drivers-store';
import { useRidesStore } from '@/stores/rides-store';
import type { Ride } from '@/stores/rides-store';

// ---------------------------------------------------------------------------
// Connection status (used by the bottom bar)
// ---------------------------------------------------------------------------

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

let statusListeners: Array<(s: ConnectionStatus) => void> = [];

export function subscribeToConnectionStatus(cb: (s: ConnectionStatus) => void) {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== cb);
  };
}

function notifyStatus(s: ConnectionStatus) {
  statusListeners.forEach((l) => l(s));
}

// ---------------------------------------------------------------------------
// Legacy dispatch channel (kept for backward compat with bottom bar)
// ---------------------------------------------------------------------------

let dispatchChannel: RealtimeChannel | null = null;

export function getDispatchChannel(): RealtimeChannel {
  if (dispatchChannel) return dispatchChannel;

  const supabase = getSupabaseBrowserClient();
  notifyStatus('connecting');

  dispatchChannel = supabase.channel('dispatch:public', {
    config: { broadcast: { self: false } },
  });

  dispatchChannel
    .on('system', {} as never, (payload) => {
      if ((payload as { extension?: string }).extension === 'postgres_changes') return;
      notifyStatus('connected');
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') notifyStatus('connected');
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') notifyStatus('disconnected');
    });

  return dispatchChannel;
}

// ---------------------------------------------------------------------------
// Agency-scoped realtime channels
// ---------------------------------------------------------------------------

let locationsChannel: RealtimeChannel | null = null;
let ridesChannel: RealtimeChannel | null = null;
let driversStatusChannel: RealtimeChannel | null = null;

// DB types are placeholder — using `any` casts for snapshot fetches until
// shared-types/database.ts is populated with real generated types.
/* eslint-disable @typescript-eslint/no-explicit-any */

async function hydrateDrivers(agencyId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('drivers' as any)
    .select('*')
    .eq('agency_id', agencyId)
    .not('status', 'in', '("offline","suspended")');

  if (error) {
    console.error('[realtime] failed to hydrate drivers:', error.message);
    return;
  }

  if (!data) return;

  const drivers: Driver[] = (data as any[]).map((row) => ({
    id: row.id,
    internalNumber: String(row.internal_number ?? row.internalNumber ?? ''),
    name: row.name ?? '',
    status: row.status ?? 'offline',
    lastSeen: row.last_seen ?? row.lastSeen,
    timeClearSince: row.time_clear_since ?? row.timeClearSince,
    currentRideId: row.current_ride_id ?? row.currentRideId,
    phone: row.phone,
    vehicleType: row.vehicle_type ?? row.vehicleType,
  }));

  useDriversStore.getState().hydrate(drivers);
}

async function hydrateRides(agencyId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('rides' as any)
    .select('*, passenger:passengers(*)')
    .eq('agency_id', agencyId)
    .in('status', [
      'requested',
      'assigned',
      'en_route_to_pickup',
      'waiting_passenger',
      'on_trip',
    ]);

  if (error) {
    console.error('[realtime] failed to hydrate rides:', error.message);
    return;
  }

  if (!data) return;

  const rides: Ride[] = (data as any[]).map(mapRowToRide);
  useRidesStore.getState().hydrate(rides);
}

function mapRowToRide(row: any): Ride {
  const ride: Ride = {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at ?? row.requestedAt ?? new Date().toISOString(),
    pickupAddress: row.pickup_address ?? row.pickupAddress ?? '',
  };

  const scheduledFor: string | undefined = row.scheduled_for ?? row.scheduledFor;
  if (scheduledFor !== undefined) ride.scheduledFor = scheduledFor;

  const requestedVia: Ride['requestedVia'] = row.requested_via ?? row.requestedVia;
  if (requestedVia !== undefined) ride.requestedVia = requestedVia;

  if (row.passenger) {
    ride.passenger = {
      id: row.passenger.id,
      name: row.passenger.name ?? '',
      phone: row.passenger.phone ?? '',
    };
  }

  const driverId: string | undefined = row.driver_id ?? row.driverId;
  if (driverId !== undefined) ride.driverId = driverId;

  const pickupLat: number | undefined = row.pickup_lat ?? row.pickupLat;
  if (pickupLat !== undefined) ride.pickupLat = pickupLat;

  const pickupLng: number | undefined = row.pickup_lng ?? row.pickupLng;
  if (pickupLng !== undefined) ride.pickupLng = pickupLng;

  const pickupZoneId: string | undefined = row.pickup_zone_id ?? row.pickupZoneId;
  if (pickupZoneId !== undefined) ride.pickupZoneId = pickupZoneId;

  const destinationAddress: string | undefined =
    row.destination_address ?? row.destinationAddress;
  if (destinationAddress !== undefined) ride.destinationAddress = destinationAddress;

  const vehicleType: Ride['vehicleType'] = row.vehicle_type ?? row.vehicleType;
  if (vehicleType !== undefined) ride.vehicleType = vehicleType;

  const passengerCount: number | undefined = row.passenger_count ?? row.passengerCount;
  if (passengerCount !== undefined) ride.passengerCount = passengerCount;

  const paymentMethod: Ride['paymentMethod'] = row.payment_method ?? row.paymentMethod;
  if (paymentMethod !== undefined) ride.paymentMethod = paymentMethod;

  const notes: string | undefined = row.notes;
  if (notes !== undefined) ride.notes = notes;

  return ride;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export function setupRealtimeChannels(agencyId: string): void {
  const supabase = getSupabaseBrowserClient();

  // Tear down any existing agency channels before recreating (idempotent)
  _teardownAgencyChannels();

  // Channel 1: driver location broadcasts
  locationsChannel = supabase.channel(`agency:${agencyId}:locations`, {
    config: { broadcast: { self: false } },
  });

  locationsChannel
    .on('broadcast', { event: 'location' }, ({ payload }) => {
      const { driverId, position } = payload as {
        driverId: string;
        position: DriverPosition;
      };
      if (driverId && position) {
        useDriversStore.getState().upsertDriverPosition(driverId, position);
      }
    })
    .subscribe();

  // Channel 2: rides postgres_changes
  ridesChannel = supabase.channel(`agency:${agencyId}:rides:queue`);

  ridesChannel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rides' },
      ({ new: row }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useRidesStore.getState().upsertRide(mapRowToRide(row as any));
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rides' },
      ({ new: row }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useRidesStore.getState().upsertRide(mapRowToRide(row as any));
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        hydrateRides(agencyId).catch(console.error);
      }
    });

  // Channel 3: driver status postgres_changes
  driversStatusChannel = supabase.channel(`agency:${agencyId}:drivers:status`);

  driversStatusChannel
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'drivers' },
      ({ new: row }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = row as any;
        const driverId: string = r.id;
        const status: Driver['status'] = r.status;

        if (!driverId || !status) return;

        useDriversStore.getState().setDriverStatus(driverId, status);

        // Sync lastSeen and timeClearSince from the DB row if present
        const existing = useDriversStore.getState().drivers.get(driverId);
        if (existing) {
          const updated: Driver = {
            ...existing,
            lastSeen: r.last_seen ?? r.lastSeen ?? existing.lastSeen,
            timeClearSince:
              r.time_clear_since ?? r.timeClearSince ?? existing.timeClearSince,
          };
          useDriversStore.getState().upsertDriver(updated);
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        hydrateDrivers(agencyId).catch(console.error);
      }
    });
}

function _teardownAgencyChannels() {
  if (locationsChannel) {
    locationsChannel.unsubscribe();
    locationsChannel = null;
  }
  if (ridesChannel) {
    ridesChannel.unsubscribe();
    ridesChannel = null;
  }
  if (driversStatusChannel) {
    driversStatusChannel.unsubscribe();
    driversStatusChannel = null;
  }
}

export function teardownRealtimeChannels(): void {
  _teardownAgencyChannels();

  if (dispatchChannel) {
    dispatchChannel.unsubscribe();
    dispatchChannel = null;
  }

  // Reset listeners to prevent accumulation on HMR (Next.js Fast Refresh re-evaluates modules)
  statusListeners = [];
}
