'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type Period = 'today' | 'yesterday';

export interface DashboardKPIs {
  ridesTotal: number;
  ridesActive: number;
  driversOnline: number;
  revenueARS: number;
  ridesCancelled: number;
  ridesTotalDelta: number | null;
  revenueARSDelta: number | null;
  ridesCancelledDelta: number | null;
}

function getPeriodBounds(period: Period): { start: string; end: string } {
  const now = new Date();
  // Work in UTC but shift by -3h (Argentina timezone offset)
  const argOffset = -3 * 60 * 60 * 1000;
  const argNow = new Date(now.getTime() + argOffset);

  // Get the start of the current "Argentina day" in UTC
  const dayStart = new Date(
    Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate())
  );
  const dayStartUtc = new Date(dayStart.getTime() - argOffset);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

  if (period === 'today') {
    return { start: dayStartUtc.toISOString(), end: dayEndUtc.toISOString() };
  }
  // yesterday
  const yStart = new Date(dayStartUtc.getTime() - 24 * 60 * 60 * 1000);
  return { start: yStart.toISOString(), end: dayStartUtc.toISOString() };
}

function getPreviousPeriodBounds(period: Period): { start: string; end: string } {
  // One day further back
  const prev: Period = period === 'today' ? 'yesterday' : 'today';
  if (prev === 'yesterday') return getPeriodBounds('yesterday');
  // "the day before yesterday"
  const yBounds = getPeriodBounds('yesterday');
  const yStart = new Date(new Date(yBounds.start).getTime() - 24 * 60 * 60 * 1000);
  const yEnd = new Date(new Date(yBounds.end).getTime() - 24 * 60 * 60 * 1000);
  return { start: yStart.toISOString(), end: yEnd.toISOString() };
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function fetchKpisForPeriod(
  sb: ReturnType<typeof getSupabaseBrowserClient>,
  start: string,
  end: string
): Promise<{
  total: number;
  revenue: number;
  cancelled: number;
}> {
  const CANCELLED_STATUSES = [
    'cancelled_by_passenger',
    'cancelled_by_driver',
    'cancelled_by_dispatcher',
    'no_show',
  ] as const;

  const [totalRes, revenueRes, cancelledRes] = await Promise.all([
    sb
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .gte('requested_at', start)
      .lt('requested_at', end),
    sb
      .from('rides')
      .select('final_fare_ars')
      .eq('status', 'completed' as string)
      .gte('ended_at', start)
      .lt('ended_at', end),
    sb
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .in('status', CANCELLED_STATUSES as unknown as string[])
      .gte('requested_at', start)
      .lt('requested_at', end),
  ]);

  const total = totalRes.count ?? 0;
  const revenueRows = (revenueRes.data ?? []) as Array<{ final_fare_ars?: unknown }>;
  const revenue = revenueRows.reduce(
    (sum, r) => sum + (Number(r.final_fare_ars) || 0),
    0
  );
  const cancelled = cancelledRes.count ?? 0;

  return { total, revenue, cancelled };
}

export function useDashboardKPIs(period: Period): {
  kpis: DashboardKPIs | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchTokenRef = useRef(0);
  const periodRef = useRef(period);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  const fetchAll = useCallback(async () => {
    const token = ++fetchTokenRef.current;
    setIsLoading(true);
    setError(null);

    const sb = getSupabaseBrowserClient();
    const currentPeriod = periodRef.current;
    const { start, end } = getPeriodBounds(currentPeriod);
    const { start: prevStart, end: prevEnd } = getPreviousPeriodBounds(currentPeriod);

    const ACTIVE_STATUSES = [
      'assigned',
      'en_route_to_pickup',
      'waiting_passenger',
      'on_trip',
    ] as const;

    try {
      const [current, previous, activeRes, onlineRes] = await Promise.all([
        fetchKpisForPeriod(sb, start, end),
        fetchKpisForPeriod(sb, prevStart, prevEnd),
        sb
          .from('rides')
          .select('id', { count: 'exact', head: true })
          .in('status', ACTIVE_STATUSES as unknown as string[]),
        sb
          .from('drivers')
          .select('id', { count: 'exact', head: true })
          .eq('is_online', true),
      ]);

      if (token !== fetchTokenRef.current) return;

      setKpis({
        ridesTotal: current.total,
        ridesActive: activeRes.count ?? 0,
        driversOnline: onlineRes.count ?? 0,
        revenueARS: current.revenue,
        ridesCancelled: current.cancelled,
        ridesTotalDelta: calcDelta(current.total, previous.total),
        revenueARSDelta: calcDelta(current.revenue, previous.revenue),
        ridesCancelledDelta: calcDelta(current.cancelled, previous.cancelled),
      });
    } catch (err: unknown) {
      if (token !== fetchTokenRef.current) return;
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      Sentry.captureException(e, { tags: { hook: 'useDashboardKpis' } });
    } finally {
      if (token === fetchTokenRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [period, fetchAll]);

  return { kpis, isLoading, error, refetch: fetchAll };
}
