import type { Metadata } from 'next';
import { Car, TrendingUp, Users, DollarSign, Clock, XCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Resumen — Admin' };
export const revalidate = 60;

async function getKpis() {
  const supabase = await getSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterday24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeRides },
    { count: ridesTotal },
    { data: incomeData },
    { count: driversOnline },
    { count: driversTotal },
    { data: assignData },
    { count: cancelledCount },
    { count: totalCount24h },
  ] = await Promise.all([
    supabase.from('rides').select('id', { count: 'exact', head: true }).in('status', ['assigned', 'on_the_way', 'in_progress']),
    supabase.from('rides').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()).eq('status', 'completed'),
    supabase.from('rides').select('fare').eq('status', 'completed').gte('created_at', todayStart.toISOString()),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver').eq('is_online', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
    supabase.from('rides').select('assigned_at, created_at').eq('status', 'completed').gte('created_at', yesterday24h).not('assigned_at', 'is', null),
    supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'cancelled').gte('created_at', yesterday24h),
    supabase.from('rides').select('id', { count: 'exact', head: true }).gte('created_at', yesterday24h),
  ]);

  const income = (incomeData ?? []).reduce((sum, r) => sum + (r.fare ?? 0), 0);

  const avgAssignMs = (() => {
    const items = (assignData ?? []).filter((r) => r.assigned_at && r.created_at);
    if (!items.length) return null;
    const sum = items.reduce((acc, r) => acc + (new Date(r.assigned_at!).getTime() - new Date(r.created_at).getTime()), 0);
    return Math.round(sum / items.length / 1000);
  })();

  const cancelRate = (totalCount24h ?? 0) > 0 ? Math.round(((cancelledCount ?? 0) / (totalCount24h ?? 1)) * 100) : 0;

  return { activeRides, ridesTotal, income, driversOnline, driversTotal, avgAssignMs, cancelRate };
}

export default async function AdminDashboard() {
  const kpis = await getKpis();

  const cards = [
    { label: 'Viajes activos', value: kpis.activeRides ?? 0, icon: Car, sub: 'en curso ahora' },
    { label: 'Viajes hoy', value: kpis.ridesTotal ?? 0, icon: TrendingUp, sub: 'completados' },
    { label: 'Ingresos hoy', value: `$${(kpis.income ?? 0).toLocaleString('es-AR')}`, icon: DollarSign, sub: 'completados' },
    { label: 'Conductores', value: `${kpis.driversOnline ?? 0}/${kpis.driversTotal ?? 0}`, icon: Users, sub: 'online / total' },
    { label: 'T. asignación P50', value: kpis.avgAssignMs != null ? `${kpis.avgAssignMs}s` : '—', icon: Clock, sub: 'últimas 24h' },
    { label: 'Cancelaciones', value: `${kpis.cancelRate}%`, icon: XCircle, sub: 'últimas 24h' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)]">
          Resumen
        </h1>
        <p className="text-sm text-[var(--neutral-500)] mt-1">Métricas en vivo — actualiza cada 60s</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, sub }) => (
          <div
            key={label}
            className="bg-[var(--neutral-0)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--neutral-500)] uppercase tracking-wide">{label}</p>
              <Icon size={16} className="text-[var(--neutral-400)]" strokeWidth={1.75} />
            </div>
            <p className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)]">
              {value}
            </p>
            <p className="text-xs text-[var(--neutral-400)] mt-1">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
