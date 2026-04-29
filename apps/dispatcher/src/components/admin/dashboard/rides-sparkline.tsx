'use client';

import { useState, useRef } from 'react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface HourBucket {
  hour: number;
  count: number;
}

interface TooltipState {
  x: number;
  y: number;
  hour: number;
  count: number;
}

export function RidesSparkline() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { data: rides, isLoading } = useSupabaseQuery<Array<{ requested_at: string }>>(
    ['rides-by-hour-24h'],
    async (sb) => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const res = await sb
        .from('rides')
        .select('requested_at')
        .gte('requested_at', start.toISOString())
        .lte('requested_at', now.toISOString());
      return {
        data: (res.data ?? []) as Array<{ requested_at: string }>,
        error: res.error,
      };
    }
  );

  // Group by hour (0..23 relative to 24h window)
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));

  if (rides && rides.length > 0) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const ride of rides) {
      const rideTime = new Date(ride.requested_at);
      const msFromStart = rideTime.getTime() - windowStart.getTime();
      const hourIndex = Math.floor(msFromStart / (60 * 60 * 1000));
      if (hourIndex >= 0 && hourIndex < 24) {
        const bucket = buckets[hourIndex];
        if (bucket) bucket.count++;
      }
    }
  }

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const svgWidth = 240;
  const svgHeight = 64;
  const barWidth = svgWidth / 24 - 2;
  const gradientId = 'sparkline-gradient';

  // Get actual hour labels (last 24h, from oldest to newest)
  const now = new Date();
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    return d.getHours();
  });

  const handleMouseEnter = (
    e: React.MouseEvent<SVGGElement>,
    bucket: HourBucket,
    index: number
  ) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = rect.left + (index * (svgWidth / 24)) * (rect.width / svgWidth);
    const y = rect.top;
    setTooltip({ x, y, hour: hourLabels[index] ?? 0, count: bucket.count });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Viajes por hora</CardTitle>
        <CardDescription>últimas 24 horas</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-md" />
        ) : !rides || rides.length === 0 ? (
          <div className="h-16 flex items-center justify-center text-sm text-[var(--neutral-500)]">
            Sin datos en las últimas 24h
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              width="100%"
              height="64"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              aria-label="Gráfico de viajes por hora"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="1" />
                </linearGradient>
              </defs>
              {buckets.map((bucket, i) => {
                const barH = Math.max(
                  2,
                  (bucket.count / maxCount) * (svgHeight - 4)
                );
                const x = i * (svgWidth / 24) + 1;
                const y = svgHeight - barH;
                return (
                  <g
                    key={i}
                    onMouseEnter={(e) => handleMouseEnter(e, bucket, i)}
                    onMouseLeave={handleMouseLeave}
                    style={{ cursor: 'default' }}
                  >
                    {/* Hit area */}
                    <rect
                      x={x}
                      y={0}
                      width={barWidth}
                      height={svgHeight}
                      fill="transparent"
                    />
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={`url(#${gradientId})`}
                      rx="1"
                    />
                  </g>
                );
              })}
            </svg>

            {tooltip && (
              <div
                className="fixed z-50 glass rounded-[var(--radius-md)] px-2 py-1 text-xs pointer-events-none"
                style={{
                  left: tooltip.x,
                  top: tooltip.y - 36,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="font-semibold text-[var(--neutral-800)]">
                  {String(tooltip.hour).padStart(2, '0')}:00
                </span>
                <span className="text-[var(--neutral-500)] ml-1">
                  — {tooltip.count} {tooltip.count === 1 ? 'viaje' : 'viajes'}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
