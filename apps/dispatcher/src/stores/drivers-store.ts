'use client';

import { create } from 'zustand';

export interface DriverPosition {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string; // ISO
}

export interface Driver {
  id: string;
  internalNumber: string; // e.g. "12"
  name: string;
  status:
    | 'available'
    | 'en_route_to_pickup'
    | 'waiting_passenger'
    | 'on_trip'
    | 'on_break'
    | 'offline'
    | 'suspended';
  position?: DriverPosition;
  lastSeen?: string; // ISO
  timeClearSince?: string; // ISO — when they became available (for FIFO sort)
  currentRideId?: string;
  phone?: string;
  vehicleType?: 'sedan' | 'suv' | 'van' | 'accessible';
}

interface DriversState {
  drivers: Map<string, Driver>; // key = driverId
  selectedDriverId: string | null;

  upsertDriver: (driver: Driver) => void;
  upsertDriverPosition: (driverId: string, position: DriverPosition) => void;
  setDriverStatus: (driverId: string, status: Driver['status']) => void;
  selectDriver: (id: string | null) => void;
  hydrate: (drivers: Driver[]) => void;
}

export const useDriversStore = create<DriversState>()((set) => ({
  drivers: new Map(),
  selectedDriverId: null,

  upsertDriver: (driver) =>
    set((s) => {
      const drivers = new Map(s.drivers);
      drivers.set(driver.id, driver);
      return { drivers };
    }),

  upsertDriverPosition: (driverId, position) =>
    set((s) => {
      const existing = s.drivers.get(driverId);
      if (!existing) return {};
      const drivers = new Map(s.drivers);
      drivers.set(driverId, { ...existing, position, lastSeen: position.timestamp });
      return { drivers };
    }),

  setDriverStatus: (driverId, status) =>
    set((s) => {
      const existing = s.drivers.get(driverId);
      if (!existing) return {};
      const drivers = new Map(s.drivers);
      const now = new Date().toISOString();
      const timeClearSince: string | undefined =
        status === 'available' && existing.status !== 'available'
          ? now
          : existing.timeClearSince;
      const updated: Driver = {
        ...existing,
        status,
        lastSeen: now,
      };
      if (timeClearSince !== undefined) {
        updated.timeClearSince = timeClearSince;
      }
      drivers.set(driverId, updated);
      return { drivers };
    }),

  selectDriver: (id) => set({ selectedDriverId: id }),

  hydrate: (drivers) => {
    const map = new Map<string, Driver>();
    drivers.forEach((d) => map.set(d.id, d));
    set({ drivers: map });
  },
}));

// Selector hooks

export const useOnlineDrivers = () =>
  useDriversStore((s) =>
    Array.from(s.drivers.values()).filter(
      (d) => d.status !== 'offline' && d.status !== 'suspended',
    ),
  );

export const useAvailableDrivers = () =>
  useDriversStore((s) =>
    Array.from(s.drivers.values())
      .filter((d) => d.status === 'available')
      .sort((a, b) => {
        // FIFO: sort by timeClearSince ascending
        const ta = a.timeClearSince ?? a.lastSeen ?? '';
        const tb = b.timeClearSince ?? b.lastSeen ?? '';
        return ta.localeCompare(tb);
      }),
  );

export const useSelectedDriver = () =>
  useDriversStore((s) =>
    s.selectedDriverId ? (s.drivers.get(s.selectedDriverId) ?? null) : null,
  );
