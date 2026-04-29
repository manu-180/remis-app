'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Select({ options, value, onValueChange, placeholder = 'Seleccioná...', disabled, id, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'focus-ring flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] px-3 py-2',
          'text-[var(--text-sm)] transition-colors duration-150 hover:border-[var(--neutral-400)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-[var(--brand-accent)]'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-[var(--neutral-900)]' : 'text-[var(--neutral-400)]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={cn('text-[var(--neutral-400)] transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="glass absolute z-50 mt-1 w-full rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden animate-[fade-up_150ms_var(--ease-emphasized)]">
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => { onValueChange?.(opt.value); setOpen(false); }}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-[var(--text-sm)] text-[var(--neutral-900)] hover:bg-[var(--neutral-100)] transition-colors duration-100"
              >
                {opt.label}
                {opt.value === value && <Check size={14} className="text-[var(--brand-primary)]" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
