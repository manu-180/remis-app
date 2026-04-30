import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6 lg:p-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* Page header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-48 mb-4" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
