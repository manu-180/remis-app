import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface DailyStats {
  ridesCompleted: number;
  ridesCancelled: number;
  revenueEfectivo: number;
  revenueMercadopago: number;
  activeDrivers: number;
  totalDrivers: number;
  avgAssignmentSeconds: number | null;
  avgPickupSeconds: number | null;
}

export function useDailyStats(): { stats: DailyStats | null; loading: boolean } {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function fetch() {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

        type RideRow = {
          status: string;
          payment_method: string | null;
          fare_amount: number | null;
          assigned_at: string | null;
          pickup_arrived_at: string | null;
          requested_at: string | null;
        };

        const { data: rawRides } = await supabase
          .from('rides')
          .select('status, payment_method, fare_amount, assigned_at, pickup_arrived_at, requested_at')
          .gte('requested_at', startOfDay)
          .lte('requested_at', endOfDay);

        const rides = rawRides as RideRow[] | null;
        if (!rides) return;

        const completed = rides.filter((r) => r.status === 'completed');
        const cancelled = rides.filter((r) => r.status?.startsWith('cancelled') || r.status === 'no_show');

        const revenueEfectivo = completed
          .filter((r) => r.payment_method === 'cash')
          .reduce((sum, r) => sum + (r.fare_amount ?? 0), 0);

        const revenueMercadopago = completed
          .filter((r) => r.payment_method === 'mercadopago')
          .reduce((sum, r) => sum + (r.fare_amount ?? 0), 0);

        const assignmentTimes = rides
          .filter((r) => r.assigned_at && r.requested_at)
          .map((r) => (new Date(r.assigned_at!).getTime() - new Date(r.requested_at!).getTime()) / 1000);
        const avgAssignment = assignmentTimes.length > 0
          ? assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length
          : null;

        setStats({
          ridesCompleted: completed.length,
          ridesCancelled: cancelled.length,
          revenueEfectivo,
          revenueMercadopago,
          activeDrivers: 0,
          totalDrivers: 0,
          avgAssignmentSeconds: avgAssignment,
          avgPickupSeconds: null,
        });
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }

    void fetch();
    const interval = setInterval(() => void fetch(), 60_000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}
