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

interface AvatarProps {
  name: string;
  avatarUrl: string | null;
  size: number;
  isFirst: boolean;
}

function DriverAvatar({ name, avatarUrl, size, isFirst }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {isFirst && (
        <Crown
          size={14}
          className="absolute -top-1 -right-1 z-10"
          style={{ color: 'var(--brand-accent)' }}
        />
      )}
      <div
        className={cn(
          'rounded-full bg-[var(--neutral-200)] flex items-center justify-center font-semibold text-[var(--neutral-700)] overflow-hidden',
          isFirst && 'ring-2 ring-[var(--brand-accent)]'
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          initials(name)
        )}
      </div>
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
