import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  dot?: string;
}

export function Badge({ className, dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dot }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
