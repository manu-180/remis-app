'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DriverMapInner = dynamic(
  () => import('./driver-map-inner').then((m) => m.DriverMapInner),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
    ),
  },
);

interface DriverTabUbicacionProps {
  driverId: string;
}

export function DriverTabUbicacion({ driverId }: DriverTabUbicacionProps) {
  return <DriverMapInner driverId={driverId} />;
}
