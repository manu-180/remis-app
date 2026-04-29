'use client';

import { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  onSearch?: (search: string) => void;
  className?: string;
}

export function Combobox({ options, value, onValueChange, placeholder = 'Buscar...', emptyMessage = 'Sin resultados', loading, onSearch, className }: ComboboxProps) {
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'focus-ring flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] px-3 py-2',
          'text-[var(--text-sm)] transition-colors duration-150 hover:border-[var(--neutral-400)]',
          open && 'border-[var(--brand-accent)]'
        )}
      >
        <span className={selected ? 'text-[var(--neutral-900)]' : 'text-[var(--neutral-400)]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={cn('text-[var(--neutral-400)] transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="glass absolute z-50 mt-1 w-full rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden animate-[fade-up_150ms_var(--ease-emphasized)]">
          <Command>
            <div className="flex items-center border-b border-[var(--neutral-200)] px-3">
              {loading
                ? <Loader2 size={16} className="text-[var(--neutral-400)] animate-spin mr-2 shrink-0" />
                : <Search  size={16} className="text-[var(--neutral-400)] mr-2 shrink-0" />
              }
              <Command.Input
                placeholder="Buscar..."
                className="flex-1 py-2 text-[var(--text-sm)] bg-transparent outline-none placeholder:text-[var(--neutral-400)] text-[var(--neutral-900)]"
                {...(onSearch ? { onValueChange: onSearch } : {})}
              />
            </div>
            <Command.List className="max-h-60 overflow-y-auto py-1">
              <Command.Empty className="py-6 text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
                {emptyMessage}
              </Command.Empty>
              {options.map((opt) => (
                <Command.Item
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => { onValueChange?.(opt.value); setOpen(false); }}
                  className="cursor-pointer px-3 py-2 text-[var(--text-sm)] text-[var(--neutral-900)] hover:bg-[var(--neutral-100)] data-[selected=true]:bg-[var(--neutral-100)] transition-colors duration-100"
                >
                  {opt.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
