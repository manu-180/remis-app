'use client';

import { create } from 'zustand';

export interface RidePassenger {
  id: string;
  name: string;
  phone: string;
}

export interface Ride {
  id: string;
  status:
    | 'requested'
    | 'assigned'
    | 'en_route_to_pickup'
    | 'waiting_passenger'
    | 'on_trip'
    | 'completed'
    | 'cancelled_by_passenger'
    | 'cancelled_by_driver'
    | 'cancelled_by_dispatcher'
    | 'no_show';
  requestedAt: string; // ISO
  scheduledFor?: string; // ISO — null means "now"
  requestedVia?: 'phone' | 'app' | 'web';
  passenger?: RidePassenger;
  driverId?: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupZoneId?: string;
  destinationAddress?: string;
  vehicleType?: 'sedan' | 'suv' | 'van' | 'accessible';
  passengerCount?: number;
  paymentMethod?: 'cash' | 'mp_checkout' | 'account';
  notes?: string;
}

const ACTIVE_STATUSES = new Set<Ride['status']>([
  'requested',
  'assigned',
  'en_route_to_pickup',
  'waiting_passenger',
  'on_trip',
]);

interface RidesState {
  rides: Map<string, Ride>; // key = rideId
  selectedRideId: string | null;

  upsertRide: (ride: Ride) => void;
  updateRideStatus: (rideId: string, status: Ride['status']) => void;
  assignRide: (rideId: string, driverId: string) => void;
  selectRide: (id: string | null) => void;
  hydrate: (rides: Ride[]) => void;
}

export const useRidesStore = create<RidesState>()((set) => ({
  rides: new Map(),
  selectedRideId: null,

  upsertRide: (ride) =>
    set((s) => {
      const rides = new Map(s.rides);
      rides.set(ride.id, ride);
      return { rides };
    }),

  updateRideStatus: (rideId, status) =>
    set((s) => {
      const existing = s.rides.get(rideId);
      if (!existing) return {};
      const rides = new Map(s.rides);
      rides.set(rideId, { ...existing, status });
      return { rides };
    }),

  assignRide: (rideId, driverId) =>
    set((s) => {
      const existing = s.rides.get(rideId);
      if (!existing) return {};
      const rides = new Map(s.rides);
      rides.set(rideId, { ...existing, driverId, status: 'assigned' });
      return { rides };
    }),

  selectRide: (id) => set({ selectedRideId: id }),

  hydrate: (rides) => {
    const map = new Map<string, Ride>();
    rides.forEach((r) => map.set(r.id, r));
    set({ rides: map });
  },
}));

// Selector hooks

export const useActiveRides = () =>
  useRidesStore((s) =>
    Array.from(s.rides.values()).filter((r) => ACTIVE_STATUSES.has(r.status)),
  );

export const useQueuedRides = () =>
  useRidesStore((s) =>
    Array.from(s.rides.values())
      .filter((r) => r.status === 'requested')
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
  );

export const useAssignedRides = () =>
  useRidesStore((s) =>
    Array.from(s.rides.values()).filter((r) => r.status === 'assigned'),
  );

export const useScheduledRides = () =>
  useRidesStore((s) =>
    Array.from(s.rides.values())
      .filter((r) => r.scheduledFor != null && ACTIVE_STATUSES.has(r.status))
      .sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '')),
  );
