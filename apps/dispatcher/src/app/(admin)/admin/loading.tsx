import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6 lg:p-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando dashboard…</span>

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
        </div>
      </div>

      {/* KPI strip — 5 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>

      {/* Row 2: Sparkline + Top Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-48 w-full" />
        </Card>
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-40 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </Card>
      </div>

      {/* Row 3: Heatmap + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-40 mb-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
