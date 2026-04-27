import type { Metadata } from 'next';
import { Activity, Wifi, WifiOff, Battery } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Heartbeat Monitor — Admin' };
export const revalidate = 0;

export default async function HeartbeatMonitorPage() {
  const supabase = await getSupabaseServerClient();
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: heartbeats } = await supabase
    .from('driver_heartbeats')
    .select('driver_id, created_at, battery_level, app_version, profiles(full_name)')
    .order('created_at', { ascending: false });

  const { data: onlineDrivers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'driver')
    .eq('is_online', true);

  const latestByDriver = new Map<string, (typeof heartbeats extends (infer T)[] | null ? T : never)>();
  for (const hb of heartbeats ?? []) {
    if (!latestByDriver.has(hb.driver_id)) {
      latestByDriver.set(hb.driver_id, hb);
    }
  }

  const rows = (onlineDrivers ?? []).map((driver) => {
    const hb = latestByDriver.get(driver.id);
    const lastSeen = hb ? new Date(hb.created_at) : null;
    const secondsAgo = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 1000) : null;
    const isAlive = lastSeen ? lastSeen.toISOString() > twoMinAgo : false;
    return { driver, hb, secondsAgo, isAlive };
  });

  const lostCount = rows.filter((r) => !r.isAlive).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-[var(--neutral-900)] flex items-center gap-2">
            <Activity size={22} className="text-[var(--brand-accent)]" />
            Heartbeat Monitor
          </h1>
          <p className="text-sm text-[var(--neutral-500)] mt-1">
            Señal en vivo de conductores online — rojo si última señal &gt;2 min
          </p>
        </div>
        {lostCount > 0 && (
          <div className="bg-red-100 text-red-700 border border-red-300 rounded-lg px-4 py-2 text-sm font-semibold">
            {lostCount} conductor{lostCount > 1 ? 'es' : ''} sin señal
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-[var(--neutral-400)]">
          No hay conductores online en este momento
        </div>
      ) : (
        <div className="bg-[var(--neutral-0)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Conductor</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Última señal</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Batería</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Versión</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ driver, hb, secondsAgo, isAlive }) => (
                <tr
                  key={driver.id}
                  className={`border-b border-[var(--neutral-100)] last:border-0 ${!isAlive ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--neutral-900)]">
                    {driver.full_name ?? driver.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    {isAlive ? (
                      <span className="flex items-center gap-1.5 text-green-600">
                        <Wifi size={14} /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                        <WifiOff size={14} /> Sin señal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--neutral-600)]">
                    {secondsAgo != null
                      ? secondsAgo < 60
                        ? `${secondsAgo}s`
                        : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--neutral-600)]">
                    {hb?.battery_level != null ? (
                      <span className="flex items-center gap-1">
                        <Battery size={13} />
                        {hb.battery_level}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--neutral-400)] font-mono text-xs">
                    {hb?.app_version ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
