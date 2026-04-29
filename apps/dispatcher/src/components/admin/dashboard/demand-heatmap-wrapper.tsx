'use client';

import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DemandHeatmapInner = dynamic(
  () => import('./demand-heatmap').then((m) => m.DemandHeatmapInner),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="w-full rounded-b-[var(--radius-lg)]" style={{ height: '320px' }} />
    ),
  }
);

export function DemandHeatmap() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>Mapa de demanda</CardTitle>
        <CardDescription>pickup últimas 24h</CardDescription>
      </CardHeader>
      <CardContent className="relative p-0 overflow-hidden rounded-b-[var(--radius-lg)]">
        <DemandHeatmapInner />
      </CardContent>
    </Card>
  );
}
