import { cn } from '@/lib/utils';

export type PillVariant = 'online' | 'busy' | 'offline' | 'danger' | 'pending';

interface StatusPillProps {
  variant: PillVariant;
  label: string;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<PillVariant, { bg: string; text: string }> = {
  online:  { bg: 'bg-[var(--pill-online)]',  text: 'text-[var(--success)]' },
  busy:    { bg: 'bg-[var(--pill-busy)]',    text: 'text-[var(--warning)]' },
  offline: { bg: 'bg-[var(--pill-offline)]', text: 'text-[var(--neutral-500)]' },
  danger:  { bg: 'bg-[var(--pill-danger)]',  text: 'text-[var(--danger)]' },
  pending: { bg: 'bg-[var(--pill-busy)]',    text: 'text-[var(--warning)]' },
};

const dotColors: Record<PillVariant, string> = {
  online:  'bg-[var(--success)]',
  busy:    'bg-[var(--warning)]',
  offline: 'bg-[var(--neutral-500)]',
  danger:  'bg-[var(--danger)]',
  pending: 'bg-[var(--warning)]',
};

export function StatusPill({ variant, label, pulse, className }: StatusPillProps) {
  const { bg, text } = variantStyles[variant];
  const shouldPulse = pulse && (variant === 'online' || variant === 'danger');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold',
        bg,
        text,
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {shouldPulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-[pulse-soft_2s_ease-in-out_infinite]',
              dotColors[variant]
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            dotColors[variant]
          )}
        />
      </span>
      {label}
    </span>
  );
}
