'use client';

import * as React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type FilterConfig =
  | { id: string; type: 'search'; placeholder?: string }
  | { id: string; type: 'multiselect'; label: string; options: Array<{ value: string; label: string }> }
  | { id: string; type: 'daterange'; label: string };

export interface FilterBarProps {
  filters: FilterConfig[];
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// SearchFilter
// ---------------------------------------------------------------------------
function SearchFilter({
  filter,
  value,
  onChange,
}: {
  filter: Extract<FilterConfig, { type: 'search' }>;
  value: string;
  onChange: (v: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const debounced = useDebounce(localValue, 300);

  // Sync debounced → parent
  const prevDebounced = React.useRef(debounced);
  React.useEffect(() => {
    if (debounced !== prevDebounced.current) {
      prevDebounced.current = debounced;
      onChange(debounced);
    }
  }, [debounced, onChange]);

  // Sync parent value back (e.g. on "clear all")
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative w-[280px]">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] pointer-events-none"
      />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={filter.placeholder ?? 'Buscar...'}
        className="pl-9"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiselectFilter
// ---------------------------------------------------------------------------
function MultiselectFilter({
  filter,
  value,
  onChange,
}: {
  filter: Extract<FilterConfig, { type: 'multiselect' }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className={cn(
          'flex items-center gap-1.5 h-10 px-3 rounded-[var(--radius-md)]',
          'border border-[var(--neutral-300)] bg-[var(--neutral-0)]',
          'text-[var(--text-sm)] text-[var(--neutral-700)]',
          'hover:bg-[var(--neutral-50)] transition-colors',
          open && 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20',
        )}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {filter.label}
        {value.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--neutral-0)] text-[10px] font-semibold">
            {value.length}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 min-w-[200px]',
            'rounded-[var(--radius-md)] border border-[var(--neutral-200)]',
            'bg-[var(--neutral-0)] shadow-[var(--shadow-lg)] py-1',
          )}
        >
          {filter.options.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 cursor-pointer',
                'text-[var(--text-sm)] text-[var(--neutral-700)]',
                'hover:bg-[var(--neutral-50)] transition-colors',
              )}
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 rounded border-[var(--neutral-300)] accent-[var(--brand-primary)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateRangeFilter
// ---------------------------------------------------------------------------
function DateRangeFilter({
  filter,
  value,
  onChange,
}: {
  filter: Extract<FilterConfig, { type: 'daterange' }>;
  value: { from?: string; to?: string };
  onChange: (v: { from?: string; to?: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--text-sm)] text-[var(--neutral-600)]">{filter.label}:</span>
      <Input
        type="date"
        value={value.from ?? ''}
        onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
        className="w-[150px]"
      />
      <span className="text-[var(--neutral-400)] text-xs">→</span>
      <Input
        type="date"
        value={value.to ?? ''}
        onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
        className="w-[150px]"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active chips
// ---------------------------------------------------------------------------
interface ChipProps {
  label: string;
  onRemove: () => void;
}

function ActiveChip({ label, onRemove }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs',
        'bg-[var(--brand-primary)] text-[var(--neutral-0)]',
        'animate-[fade-in_200ms_ease,scale-in_200ms_ease]',
      )}
      style={{
        animation: 'fadein 200ms ease forwards',
      }}
    >
      {label}
      <button
        className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
        onClick={onRemove}
        aria-label={`Quitar filtro: ${label}`}
        type="button"
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main FilterBar
// ---------------------------------------------------------------------------
export function FilterBar({ filters, value, onChange, className }: FilterBarProps) {
  const activeChips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  for (const f of filters) {
    const v = value[f.id];
    if (f.type === 'search' && typeof v === 'string' && v.trim()) {
      activeChips.push({
        id: f.id,
        label: `Búsqueda: "${v}"`,
        onRemove: () => onChange({ ...value, [f.id]: '' }),
      });
    } else if (f.type === 'multiselect' && Array.isArray(v) && v.length > 0) {
      const selectedLabels = (v as string[]).map((sv) => {
        const opt = f.options.find((o) => o.value === sv);
        return opt?.label ?? sv;
      });
      activeChips.push({
        id: f.id,
        label: `${f.label}: ${selectedLabels.join(', ')}`,
        onRemove: () => onChange({ ...value, [f.id]: [] }),
      });
    } else if (f.type === 'daterange' && typeof v === 'object' && v !== null) {
      const range = v as { from?: string; to?: string };
      if (range.from || range.to) {
        const parts = [range.from, range.to].filter(Boolean);
        activeChips.push({
          id: f.id,
          label: `${f.label}: ${parts.join(' → ')}`,
          onRemove: () => onChange({ ...value, [f.id]: {} }),
        });
      }
    }
  }

  const clearAll = () => {
    const cleared: Record<string, unknown> = {};
    for (const f of filters) {
      if (f.type === 'search') cleared[f.id] = '';
      if (f.type === 'multiselect') cleared[f.id] = [];
      if (f.type === 'daterange') cleared[f.id] = {};
    }
    onChange(cleared);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          if (f.type === 'search') {
            return (
              <SearchFilter
                key={f.id}
                filter={f}
                value={typeof value[f.id] === 'string' ? (value[f.id] as string) : ''}
                onChange={(v) => onChange({ ...value, [f.id]: v })}
              />
            );
          }
          if (f.type === 'multiselect') {
            return (
              <MultiselectFilter
                key={f.id}
                filter={f}
                value={Array.isArray(value[f.id]) ? (value[f.id] as string[]) : []}
                onChange={(v) => onChange({ ...value, [f.id]: v })}
              />
            );
          }
          if (f.type === 'daterange') {
            return (
              <DateRangeFilter
                key={f.id}
                filter={f}
                value={
                  typeof value[f.id] === 'object' && value[f.id] !== null
                    ? (value[f.id] as { from?: string; to?: string })
                    : {}
                }
                onChange={(v) => onChange({ ...value, [f.id]: v })}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <ActiveChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-900)]"
            type="button"
          >
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
}
