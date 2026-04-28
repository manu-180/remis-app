'use client';
import { useEffect } from 'react';
import { useDriversStore } from '@/stores/drivers-store';
import { useRidesStore } from '@/stores/rides-store';

type SyncMessage =
  | { type: 'SELECT_DRIVER'; driverId: string }
  | { type: 'SELECT_RIDE'; rideId: string }
  | { type: 'PING' };

const CHANNEL_NAME = 'dispatch-sync';

export function useBroadcastSync(role: 'primary' | 'secondary') {
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);

    if (role === 'primary') {
      const unsubDrivers = useDriversStore.subscribe((state, prev) => {
        if (state.selectedDriverId !== prev.selectedDriverId && state.selectedDriverId) {
          channel.postMessage({ type: 'SELECT_DRIVER', driverId: state.selectedDriverId } satisfies SyncMessage);
        }
      });
      const unsubRides = useRidesStore.subscribe((state, prev) => {
        if (state.selectedRideId !== prev.selectedRideId && state.selectedRideId) {
          channel.postMessage({ type: 'SELECT_RIDE', rideId: state.selectedRideId } satisfies SyncMessage);
        }
      });
      return () => {
        unsubDrivers();
        unsubRides();
        channel.close();
      };
    } else {
      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        const msg = event.data;
        if (msg.type === 'SELECT_DRIVER') {
          useDriversStore.getState().selectDriver(msg.driverId);
        } else if (msg.type === 'SELECT_RIDE') {
          useRidesStore.getState().selectRide(msg.rideId);
        }
      };
      return () => channel.close();
    }
  }, [role]);
}

export function broadcastMessage(msg: SyncMessage) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(msg);
  channel.close();
}
