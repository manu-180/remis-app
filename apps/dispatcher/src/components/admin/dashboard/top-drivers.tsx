'use client';

import { useState } from 'react';
import { Crown, Star } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusPill, type PillVariant } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { formatARS, initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Database } from '@remis/shared-types/database';

type DriverStatus = Database['public']['Enums']['driver_status'];

interface TopDriver {
  driver_id: string;
  full_name: string;
  avatar_url: string | null;
  trips_today: number;
  revenue_today: number;
  rating: number;
  current_status: DriverStatus;
}

function driverStatusToPill(status: DriverStatus): PillVariant {
  switch (status) {
    case 'available':
      return 'online';
    case 'on_trip':
    case 'en_route_to_pickup':
    case 'waiting_passenger':
      return 'busy';
    case 'suspended':
      return 'danger';
    case 'offline':
    case 'on_break':
    default:
      return 'offline';
  }
}

function driverStatusLabel(status: DriverStatus): string {
  switch (status) {
    case 'available': return 'disponible';
    case 'on_trip': return 'en viaje';
    case 'en_route_to_pickup': return 'en camino';
    case 'waiting_passenger': return 'esperando';
    case 'suspended': return 'suspendido';
    case 'on_break': return 'descanso';
    case 'offline': return 'offline';
    default: return status;
  }
}

// ---------------------------------------------------------------------------
// Premium gradient avatars: deterministic hash(name) → palette
// ---------------------------------------------------------------------------
const AVATAR_PALETTES: Array<{ from: string; to: string; ring: string }> = [
  { from: '#6366F1', to: '#8B5CF6', ring: 'rgba(139, 92, 246, 0.35)' }, // indigo → violet
  { from: '#0EA5E9', to: '#22D3EE', ring: 'rgba(14, 165, 233, 0.35)' }, // sky → cyan
  { from: '#14B8A6', to: '#10B981', ring: 'rgba(20, 184, 166, 0.35)' }, // teal → emerald
  { from: '#F59E0B', to: '#EF4444', ring: 'rgba(239, 68, 68, 0.35)' },  // amber → red
  { from: '#EC4899', to: '#F43F5E', ring: 'rgba(236, 72, 153, 0.35)' }, // pink → rose
  { from: '#3B82F6', to: '#6366F1', ring: 'rgba(59, 130, 246, 0.35)' }, // blue → indigo
  { from: '#8B5CF6', to: '#EC4899', ring: 'rgba(139, 92, 246, 0.35)' }, // violet → pink
  { from: '#06B6D4', to: '#3B82F6', ring: 'rgba(6, 182, 212, 0.35)' },  // cyan → blue
  { from: '#F97316', to: '#F59E0B', ring: 'rgba(249, 115, 22, 0.35)' }, // orange → amber
  { from: '#10B981', to: '#06B6D4', ring: 'rgba(16, 185, 129, 0.35)' }, // emerald → cyan
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function paletteFor(name: string): { from: string; to: string; ring: string } {
  const idx = hashName(name) % AVATAR_PALETTES.length;
  // Length is a non-empty literal, so this is always defined.
  return AVATAR_PALETTES[idx] as { from: string; to: string; ring: string };
}

// URLs of demo/placeholder avatar services — ignore so we render premium
// gradient initials instead. Real photos in Supabase Storage will pass through.
const PLACEHOLDER_AVATAR_HOSTS = ['pravatar', 'dicebear', 'ui-avatars', 'gravatar'];

function isPlaceholderAvatar(url: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_AVATAR_HOSTS.some((host) => lower.includes(host));
}

interface AvatarProps {
  name: string;
  avatarUrl: string | null;
  size: number;
  isFirst: boolean;
}

function DriverAvatar({ name, avatarUrl, size, isFirst }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const palette = paletteFor(name);
  const useImage = avatarUrl && !isPlaceholderAvatar(avatarUrl) && !imgFailed;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {isFirst && (
        <span
          aria-hidden
          className="absolute inset-0 -m-[3px] rounded-full pointer-events-none"
          style={{
            background:
              'conic-gradient(from 200deg, #FBBF24, #F59E0B, #FCD34D, #F59E0B, #FBBF24)',
            padding: 3,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.45))',
          }}
        />
      )}
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center font-bold tracking-tight text-white select-none"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          background: useImage
            ? 'transparent'
            : `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          boxShadow: useImage
            ? 'inset 0 0 0 1px rgba(255,255,255,0.08)'
            : `0 1px 2px rgba(0,0,0,0.18), 0 6px 18px -4px ${palette.ring}, inset 0 1px 0 rgba(255,255,255,0.18)`,
          textShadow: useImage ? 'none' : '0 1px 1px rgba(0,0,0,0.18)',
        }}
      >
        {useImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl!}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span style={{ letterSpacing: '-0.02em' }}>{initials(name)}</span>
        )}
      </div>
      {isFirst && (
        <Crown
          size={Math.round(size * 0.32)}
          aria-label="Top conductor"
          className="absolute -top-2 -right-1.5 z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
          style={{ color: '#F59E0B', fill: '#FBBF24', transform: 'rotate(18deg)' }}
        />
      )}
    </div>
  );
}

export function TopDrivers() {
  const { data: drivers, isLoading } = useSupabaseQuery<TopDriver[]>(
    ['top-drivers-today'],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (sb as any).rpc('top_drivers_today', { p_limit: 5 });
      return { data: (res.data ?? []) as TopDriver[], error: res.error };
    }
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Top conductores</CardTitle>
        <CardDescription>hoy</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3 border-b border-[var(--neutral-100)] last:border-0">
                <Skeleton className="rounded-full shrink-0" style={{ width: 36, height: 36 }} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : !drivers || drivers.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[var(--neutral-500)] text-center">
            Sin datos de conductores hoy
          </div>
        ) : (
          <ul className="overflow-y-auto" style={{ maxHeight: '300px' }}>
            {drivers.map((driver, index) => {
              const isFirst = index === 0;
              const avatarSize = isFirst ? 48 : 36;
              const pillVariant = driverStatusToPill(driver.current_status);
              const pillLabel = driverStatusLabel(driver.current_status);
              const ratingDisplay = driver.rating
                ? driver.rating.toFixed(1)
                : '—';

              return (
                <li
                  key={driver.driver_id}
                  className="flex items-center gap-3 px-6 py-3 border-b border-[var(--neutral-100)] last:border-0 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <DriverAvatar
                    name={driver.full_name}
                    avatarUrl={driver.avatar_url}
                    size={avatarSize}
                    isFirst={isFirst}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium text-[var(--neutral-900)] truncate',
                      isFirst ? 'text-base' : 'text-sm'
                    )}>
                      {driver.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusPill variant={pillVariant} label={pillLabel} />
                      {driver.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-[var(--neutral-500)]">
                          <Star size={11} className="text-[var(--brand-accent)]" fill="var(--brand-accent)" />
                          {ratingDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[var(--neutral-800)]">
                      {driver.trips_today} {driver.trips_today === 1 ? 'viaje' : 'viajes'}
                    </p>
                    <p className="text-xs text-[var(--neutral-500)]">
                      {formatARS(driver.revenue_today)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
