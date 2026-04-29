'use client';

import { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 600, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span ref={ref}>0</span>;
}

interface StatProps {
  label: string;
  value: number | string;
  delta?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function Stat({ label, value, delta, icon, loading, prefix, suffix, className }: StatProps) {
  if (loading) {
    return (
      <div className={cn('p-4 space-y-3', className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const isPositive = delta !== undefined && delta >= 0;

  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[var(--text-sm)] text-[var(--neutral-500)] font-medium">{label}</span>
        {icon && <span className="text-[var(--neutral-400)]">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <p className="tabular text-3xl font-bold tracking-tight text-[var(--neutral-900)]">
          {prefix}
          {typeof value === 'number' ? <CountUp value={value} /> : value}
          {suffix}
        </p>
        {delta !== undefined && (
          <span className={cn(
            'flex items-center gap-0.5 text-[var(--text-sm)] font-medium mb-0.5',
            isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
          )}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
