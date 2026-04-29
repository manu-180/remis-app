'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical } from 'lucide-react';
import { StatusPill, type PillVariant } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Text column
// ---------------------------------------------------------------------------
export function createTextColumn<T>(
  key: keyof T,
  label: string,
  opts?: { minWidth?: number },
): ColumnDef<T, string> {
  return {
    accessorKey: key as string,
    header: label,
    ...(opts?.minWidth !== undefined ? { size: opts.minWidth } : {}),
    cell: ({ getValue }) => (
      <span className="block truncate" title={String(getValue() ?? '')}>
        {String(getValue() ?? '')}
      </span>
    ),
  };
}

// ---------------------------------------------------------------------------
// Tabular number column (monospace-ish)
// ---------------------------------------------------------------------------
export function createTabularColumn<T>(
  key: keyof T,
  label: string,
  opts?: { suffix?: string },
): ColumnDef<T, number> {
  return {
    accessorKey: key as string,
    header: label,
    cell: ({ getValue }) => (
      <span className="font-['tabular-nums'] tabular-nums">
        {String(getValue() ?? '')}
        {opts?.suffix ? ` ${opts.suffix}` : ''}
      </span>
    ),
  };
}

// ---------------------------------------------------------------------------
// Date column
// ---------------------------------------------------------------------------
export function createDateColumn<T>(
  key: keyof T,
  label: string,
): ColumnDef<T, string> {
  return {
    accessorKey: key as string,
    header: label,
    cell: ({ getValue }) => {
      const v = getValue();
      if (!v) return <span className="text-[var(--neutral-400)]">—</span>;
      try {
        return (
          <span className="tabular-nums whitespace-nowrap">
            {format(new Date(v), 'd MMM, HH:mm', { locale: es })}
          </span>
        );
      } catch {
        return <span>{String(v)}</span>;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Status column
// ---------------------------------------------------------------------------
export function createStatusColumn<T>(
  getStatus: (row: T) => { variant: PillVariant; label: string },
  // type is reserved for future use (e.g. different pill rendering per entity)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _type: 'driver' | 'ride',
): ColumnDef<T, unknown> {
  return {
    id: 'status',
    header: 'Estado',
    enableSorting: false,
    cell: ({ row }) => {
      const { variant, label } = getStatus(row.original);
      return <StatusPill variant={variant} label={label} />;
    },
  };
}

// ---------------------------------------------------------------------------
// Currency ARS column
// ---------------------------------------------------------------------------
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function createCurrencyColumn<T>(
  key: keyof T,
  label: string,
): ColumnDef<T, number> {
  return {
    accessorKey: key as string,
    header: label,
    cell: ({ getValue }) => {
      const v = getValue();
      if (v == null) return <span className="text-[var(--neutral-400)]">—</span>;
      return <span className="tabular-nums">{arsFormatter.format(v)}</span>;
    },
  };
}

// ---------------------------------------------------------------------------
// Avatar column (28px circle + name)
// ---------------------------------------------------------------------------
export function createAvatarColumn<T>(
  getAvatar: (row: T) => string | null,
  getName: (row: T) => string,
): ColumnDef<T, unknown> {
  return {
    id: 'avatar_name',
    header: 'Conductor',
    enableSorting: false,
    cell: ({ row }) => {
      const src = getAvatar(row.original);
      const name = getName(row.original);
      const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');

      return (
        <div className="flex items-center gap-2.5">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={name}
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                'bg-[var(--brand-primary)] text-[var(--neutral-0)] text-[10px] font-semibold',
              )}
            >
              {initials}
            </span>
          )}
          <span className="truncate font-medium">{name}</span>
        </div>
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Actions (kebab menu)
// ---------------------------------------------------------------------------
interface ActionItem<T> {
  icon: React.ReactNode;
  label: string;
  onClick: (row: T) => void;
  danger?: boolean;
}

interface ActionsMenuProps<T> {
  row: T;
  actions: ActionItem<T>[];
}

function ActionsMenu<T>({ row, actions }: ActionsMenuProps<T>) {
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

  return (
    <div className="relative flex justify-center" ref={ref}>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-900)] transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Acciones"
        title="Acciones"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-1 min-w-[160px]',
            'rounded-[var(--radius-md)] border border-[var(--neutral-200)]',
            'bg-[var(--neutral-0)] shadow-[var(--shadow-lg)] py-1',
          )}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-sm)]',
                'hover:bg-[var(--neutral-50)] transition-colors',
                action.danger
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--neutral-700)]',
              )}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onClick(row);
              }}
              title={action.label}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function createActionsColumn<T>(
  actions: ActionItem<T>[],
): ColumnDef<T, unknown> {
  return {
    id: '__actions__',
    header: '',
    size: 52,
    enableSorting: false,
    cell: ({ row }) => <ActionsMenu row={row.original} actions={actions} />,
  };
}
