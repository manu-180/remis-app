import type { Metadata } from 'next';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'SLOs — Admin' };
export const revalidate = 300;

const SLO_DEFINITIONS = [
  { id: 'assignment_p50', label: 'Tiempo de asignación P50', target: 60, unit: 's', direction: 'lower' },
  { id: 'assignment_p95', label: 'Tiempo de asignación P95', target: 180, unit: 's', direction: 'lower' },
  { id: 'heartbeat_loss', label: 'Heartbeat loss rate diario', target: 5, unit: '%', direction: 'lower' },
  { id: 'crash_free', label: 'Sesiones crash-free', target: 99, unit: '%', direction: 'higher' },
];

async function getSloData() {
  const supabase = await getSupabaseServerClient();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: completedRides } = await supabase
    .from('rides')
    .select('created_at, assigned_at')
    .eq('status', 'completed')
    .gte('created_at', monthAgo)
    .not('assigned_at', 'is', null);

  const assignTimes = (completedRides ?? [])
    .map((r) => (new Date(r.assigned_at!).getTime() - new Date(r.created_at).getTime()) / 1000)
    .sort((a, b) => a - b);

  const p50 = assignTimes.length ? assignTimes[Math.floor(assignTimes.length * 0.5)] : null;
  const p95 = assignTimes.length ? assignTimes[Math.floor(assignTimes.length * 0.95)] : null;

  const { count: onlineDrivers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'driver')
    .eq('is_online', true);

  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: recentHb } = await supabase
    .from('driver_heartbeats')
    .select('driver_id')
    .gte('created_at', twoMinAgo);

  const activeHb = new Set(recentHb?.map((h) => h.driver_id)).size;
  const lossRate = (onlineDrivers ?? 0) > 0
    ? Math.round((((onlineDrivers ?? 0) - activeHb) / (onlineDrivers ?? 1)) * 100)
    : 0;

  return {
    assignment_p50: p50 != null ? Math.round(p50) : null,
    assignment_p95: p95 != null ? Math.round(p95) : null,
    heartbeat_loss: lossRate,
    crash_free: null as number | null, // Sentry provides this externally
  };
}

export default async function SLOPage() {
  const data = await getSloData();

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck size={20} className="text-[var(--brand-accent)]" />
        <h1 className="font-bold text-2xl text-[var(--neutral-900)]">SLOs</h1>
      </div>
      <p className="text-sm text-[var(--neutral-500)] mb-6">
        Objetivos de nivel de servicio — datos de los últimos 30 días
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SLO_DEFINITIONS.map((slo) => {
          const value = data[slo.id as keyof typeof data];
          const passing =
            value == null
              ? null
              : slo.direction === 'lower'
              ? value <= slo.target
              : value >= slo.target;

          return (
            <div
              key={slo.id}
              className={`bg-[var(--neutral-0)] rounded-[var(--radius-xl)] border p-5 ${
                passing === false
                  ? 'border-red-300 bg-red-50'
                  : passing === true
                  ? 'border-green-300'
                  : 'border-[var(--neutral-200)]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[var(--neutral-700)]">{slo.label}</p>
                {passing === true && <CheckCircle2 size={16} className="text-green-600" />}
                {passing === false && <XCircle size={16} className="text-red-600" />}
              </div>
              <div className="flex items-end gap-3">
                <span className="font-bold text-2xl text-[var(--neutral-900)]">
                  {value != null ? `${value}${slo.unit}` : '—'}
                </span>
                <span className="text-sm text-[var(--neutral-400)] mb-0.5">
                  objetivo: {slo.direction === 'lower' ? '<' : '>'} {slo.target}{slo.unit}
                </span>
              </div>
              {slo.id === 'crash_free' && (
                <p className="text-xs text-[var(--neutral-400)] mt-2">Ver en Sentry → Releases</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
