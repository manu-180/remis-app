'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export function Switch({ checked, onCheckedChange, disabled, id, className, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'focus-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors duration-[240ms] ease-[var(--ease-spring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[var(--brand-primary)]' : 'bg-[var(--neutral-300)]',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)]',
          'transition-transform duration-[240ms] ease-[var(--ease-spring)]',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}
