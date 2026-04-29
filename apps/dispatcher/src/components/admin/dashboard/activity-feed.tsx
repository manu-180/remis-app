'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Car, Activity } from 'lucide-react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { relativeTime } from '@/lib/format';
import { playNewRideSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';

interface FeedItem {
  id: string;
  type: 'new_ride' | 'ride_event' | 'sos';
  message: string;
  timestamp: Date;
  isNew?: boolean;
}

function formatEventMessage(eventType: string): string {
  const map: Record<string, string> = {
    assigned: 'Viaje asignado a conductor',
    en_route_to_pickup: 'Conductor en camino al pasajero',
    waiting_passenger: 'Conductor esperando al pasajero',
    on_trip: 'Viaje en curso',
    completed: 'Viaje completado',
    cancelled_by_passenger: 'Cancelado por el pasajero',
    cancelled_by_driver: 'Cancelado por el conductor',
    cancelled_by_dispatcher: 'Cancelado por el operador',
    no_show: 'Pasajero no se presentó',
  };
  return map[eventType] ?? `Evento: ${eventType}`;
}

function FeedIcon({ type }: { type: FeedItem['type'] }) {
  if (type === 'sos')
    return <AlertTriangle size={16} className="text-[var(--danger)]" />;
  if (type === 'new_ride')
    return <Car size={16} className="text-[var(--brand-primary)]" />;
  return <Activity size={16} className="text-[var(--neutral-500)]" />;
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [sosShake, setSosShake] = useState(false);
  const [, setTick] = useState(0);
  const counterRef = useRef(0);

  // Update relative times every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load initial history
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    let cancelled = false;

    async function load() {
      const [ridesRes, eventsRes] = await Promise.all([
        sb
          .from('rides')
          .select('id, requested_at')
          .order('requested_at', { ascending: false })
          .limit(8),
        sb
          .from('ride_events')
          .select('id, ride_id, event_type, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (cancelled) return;

      type RideRow = { id: string; requested_at: string };
      type EventRow = { id: string; ride_id: string; event_type: string; created_at: string };

      const rideItems: FeedItem[] = ((ridesRes.data ?? []) as RideRow[]).map((r) => ({
        id: `ride-${r.id}`,
        type: 'new_ride' as const,
        message: 'Viaje solicitado',
        timestamp: new Date(r.requested_at),
      }));

      const eventItems: FeedItem[] = ((eventsRes.data ?? []) as EventRow[]).map((e) => ({
        id: `event-${e.id}`,
        type: 'ride_event' as const,
        message: formatEventMessage(e.event_type),
        timestamp: new Date(e.created_at),
      }));

      const merged = [...rideItems, ...eventItems]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 15);

      setItems(merged);
    }

    load().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const addItem = useCallback((item: Omit<FeedItem, 'isNew'>) => {
    const newItem: FeedItem = { ...item, isNew: true };

    setItems((prev) => {
      const next = [newItem, ...prev].slice(0, 20);
      return next;
    });

    // Clear isNew after 800ms
    setTimeout(() => {
      setItems((prev) =>
        prev.map((i) => (i.id === newItem.id ? { ...i, isNew: false } : i))
      );
    }, 800);
  }, []);

  // Realtime: new rides
  useRealtimeTable(
    'rides',
    { event: 'INSERT' },
    useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        counterRef.current++;
        const newRow = payload.new as Record<string, unknown> | undefined;
        addItem({
          id: `rt-ride-${newRow?.id ?? counterRef.current}`,
          type: 'new_ride',
          message: 'Nuevo viaje solicitado',
          timestamp: new Date(),
        });
      },
      [addItem]
    )
  );

  // Realtime: ride events
  useRealtimeTable(
    'ride_events',
    { event: 'INSERT' },
    useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        counterRef.current++;
        const newRow = payload.new as Record<string, unknown> | undefined;
        const eventType = (newRow?.event_type as string) ?? '';
        addItem({
          id: `rt-event-${newRow?.id ?? counterRef.current}`,
          type: 'ride_event',
          message: formatEventMessage(eventType),
          timestamp: new Date(),
        });
      },
      [addItem]
    )
  );

  // Realtime: SOS events
  useRealtimeTable(
    'sos_events',
    { event: 'INSERT' },
    useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        counterRef.current++;
        const newRow = payload.new as Record<string, unknown> | undefined;
        addItem({
          id: `rt-sos-${newRow?.id ?? counterRef.current}`,
          type: 'sos',
          message: 'SOS activado',
          timestamp: new Date(),
        });
        setSosShake(true);
        setTimeout(() => setSosShake(false), 400);
        playNewRideSound();
      },
      [addItem]
    )
  );

  return (
    <Card
      className={cn(
        'flex flex-col',
        sosShake && 'animate-[shake-x_400ms_ease-in-out]'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Actividad reciente</CardTitle>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--neutral-100)] px-2 py-0.5 text-xs font-medium text-[var(--neutral-600)] min-w-[1.5rem]">
              {items.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1" style={{ height: '340px' }}>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--neutral-500)]">
            Sin actividad reciente
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-start gap-3 py-3 px-4 border-b border-[var(--neutral-100)] last:border-0',
                  item.isNew && 'animate-[highlight-gold_800ms_ease-out]',
                  item.type === 'sos' && 'bg-[var(--danger-bg)]'
                )}
              >
                <span className="mt-0.5 shrink-0">
                  <FeedIcon type={item.type} />
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm text-[var(--neutral-800)]"
                    style={{ fontSize: 'var(--text-sm)' }}
                  >
                    {item.message}
                  </p>
                  <p
                    className="text-[var(--neutral-500)] mt-0.5"
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    {relativeTime(item.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
