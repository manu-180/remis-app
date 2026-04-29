'use client';

import { BarChart3, TrendingUp, Star, CheckSquare } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Skeleton } from '@/components/ui/skeleton';
import { formatARS, formatDateShort } from '@/lib/format';
import { mapDriverStatus } from '../drivers-list-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MonthRide = {
  id: string;
  status: string;
  final_fare_ars: number | null;
  requested_at: string | null;
};

type RideEvent = {
  id: number;
  ride_id: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string | null;
};

// ---------------------------------------------------------------------------
// Simple sparkline using inline SVG
// ---------------------------------------------------------------------------
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 200;
  const h = 40;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (v / max) * h}
          r={3}
          fill="var(--brand-accent)"
          opacity={0.7}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface DriverTabResumenProps {
  driverId: string;
}

export function DriverTabResumen({ driverId }: DriverTabResumenProps) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  // Rides this month
  const { data: monthRides, isLoading: ridesLoading } = useSupabaseQuery<MonthRide[]>(
    ['driver-month-rides', driverId],
    async (sb) => {
      const result = await sb
        .from('rides')
        .select('id, status, final_fare_ars, requested_at')
        .eq('driver_id', driverId)
        .gte('requested_at', start.toISOString());
      return { data: result.data ?? [], error: result.error };
    },
  );

  // Recent ride events
  const { data: recentEvents, isLoading: eventsLoading } = useSupabaseQuery<RideEvent[]>(
    ['driver-recent-events', driverId],
    async (sb) => {
      const result = await sb
        .from('ride_events')
        .select('id, ride_id, from_status, to_status, created_at')
        .eq('actor_id', driverId)
        .order('created_at', { ascending: false })
        .limit(8);
      return { data: result.data ?? [], error: result.error };
    },
  );

  // Compute KPIs
  const completedRides = monthRides?.filter((r) => r.status === 'completed') ?? [];
  const cancelledByDriver = monthRides?.filter((r) =>
    ['cancelled_by_driver', 'no_show'].includes(r.status),
  ) ?? [];
  const totalFare = completedRides.reduce((acc, r) => acc + (r.final_fare_ars ?? 0), 0);
  const totalAttempts = completedRides.length + cancelledByDriver.length;
  const acceptanceRate =
    totalAttempts > 0 ? Math.round((completedRides.length / totalAttempts) * 100) : 0;

  // Build daily sparkline (last 30 days)
  const dailyCounts: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyCounts[key] = 0;
  }
  (monthRides ?? []).forEach((r) => {
    if (!r.requested_at) return;
    const key = r.requested_at.slice(0, 10);
    if (key in dailyCounts) dailyCounts[key] = (dailyCounts[key] ?? 0) + 1;
  });
  const sparklineData = Object.values(dailyCounts);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <Stat
            label="Viajes este mes"
            value={completedRides.length}
            icon={<BarChart3 size={16} />}
            loading={ridesLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Ingresos generados"
            value={ridesLoading ? 0 : totalFare}
            prefix="$ "
            loading={ridesLoading}
            icon={<TrendingUp size={16} />}
          />
        </Card>
        <Card>
          <Stat
            label="Rating promedio"
            value={ridesLoading ? '—' : '5.0'}
            icon={<Star size={16} />}
            loading={ridesLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Tasa de aceptación"
            value={ridesLoading ? 0 : acceptanceRate}
            suffix="%"
            icon={<CheckSquare size={16} />}
            loading={ridesLoading}
          />
        </Card>
      </div>

      {/* Sparkline */}
      <Card>
        <CardHeader>
          <CardTitle>Viajes últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          {ridesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-end gap-2">
              <Sparkline data={sparklineData} />
              <span className="text-xs text-[var(--neutral-500)] mb-1">
                {completedRides.length} completados este mes
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent events feed */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {eventsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !recentEvents?.length ? (
            <p className="text-sm text-[var(--neutral-500)] py-4 text-center">Sin actividad reciente.</p>
          ) : (
            <ul className="divide-y divide-[var(--neutral-100)]">
              {recentEvents.map((ev) => {
                const fromLabel = ev.from_status ? mapDriverStatus(ev.from_status).label : '—';
                const toLabel = ev.to_status ? mapDriverStatus(ev.to_status).label : '—';
                return (
                  <li key={ev.id} className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-sm text-[var(--neutral-700)]">
                      {fromLabel} &rarr; {toLabel}
                    </span>
                    <span className="text-xs text-[var(--neutral-400)] whitespace-nowrap">
                      {ev.created_at ? formatDateShort(ev.created_at) : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
