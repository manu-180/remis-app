'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

type Density = 'comfortable' | 'compact' | 'dense';

const densityHeight: Record<Density, string> = {
  comfortable: 'h-14',
  compact: 'h-11',
  dense: 'h-9',
};

interface PaginationProps {
  pageIndex: number;
  pageSize: number;
  total: number;
  onChange: (p: { pageIndex: number; pageSize: number }) => void;
}

interface SelectionProps {
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: Error | null;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  pagination?: PaginationProps;
  sortable?: boolean;
  density?: Density;
  stickyHeader?: boolean;
  selection?: SelectionProps;
  virtualizer?: boolean;
  className?: string;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error = null,
  emptyState,
  onRowClick,
  pagination,
  sortable = true,
  density,
  stickyHeader = true,
  selection,
  virtualizer: useVirtualizerProp = false,
  className,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Determine density from prop or html[data-density]
  const resolvedDensity = React.useMemo<Density>(() => {
    if (density) return density;
    if (typeof document !== 'undefined') {
      const d = document.documentElement.dataset.density as Density | undefined;
      if (d && (d === 'comfortable' || d === 'compact' || d === 'dense')) return d;
    }
    return 'comfortable';
  }, [density]);

  // Build columns with optional selection column
  const tableColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    const cols = columns as ColumnDef<TData, unknown>[];
    if (!selection) return cols;

    const selectCol: ColumnDef<TData, unknown> = {
      id: '__select__',
      size: 44,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[var(--neutral-300)] accent-[var(--brand-primary)]"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[var(--neutral-300)] accent-[var(--brand-primary)]"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          aria-label="Seleccionar fila"
        />
      ),
    };
    return [selectCol, ...cols];
  }, [columns, selection]);

  const table = useReactTable<TData>({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
    },
    enableSorting: sortable,
    enableRowSelection: !!selection,
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (selection && getRowId) {
          const ids = Object.keys(next).filter((k) => next[k]);
          selection.onSelectionChange(ids);
        }
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(getRowId ? { getRowId } : {}),
  });

  const rows = table.getRowModel().rows;

  // Virtualizer setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const shouldVirtualize = useVirtualizerProp && data.length > 100;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (resolvedDensity === 'comfortable' ? 56 : resolvedDensity === 'compact' ? 44 : 36),
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Loading state
  if (loading) {
    return (
      <Card variant="glass" className={cn('overflow-hidden', className)}>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead className={cn(stickyHeader && 'sticky top-0 z-10 bg-[var(--neutral-100)]')}>
              <tr>
                {tableColumns.map((col, i) => (
                  <th
                    key={i}
                    className="h-11 px-4 text-left text-xs uppercase tracking-widest font-semibold text-[var(--neutral-600)]"
                  >
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }, (_, rowIdx) => (
                <tr key={rowIdx} className="border-t border-[var(--neutral-100)]">
                  {tableColumns.map((_, colIdx) => {
                    const widths = ['70%', '40%', '60%', '80%', '50%'];
                    const w = widths[colIdx % widths.length];
                    return (
                      <td key={colIdx} className={cn('px-4', densityHeight[resolvedDensity])}>
                        <Skeleton className="h-3" style={{ width: w }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card variant="glass" className={cn('overflow-hidden', className)}>
        <EmptyState
          icon={<AlertTriangle size={32} className="text-[var(--danger)]" />}
          title="Error al cargar los datos"
          description={error.message}
          action={{ label: 'Reintentar', onClick: () => window.location.reload() }}
        />
      </Card>
    );
  }

  // Empty state
  if (!loading && rows.length === 0) {
    return (
      <Card variant="glass" className={cn('overflow-hidden', className)}>
        {emptyState ?? (
          <EmptyState
            icon={<Inbox size={32} />}
            title="Sin resultados"
            description="No hay datos que mostrar."
          />
        )}
      </Card>
    );
  }

  const rowHeightClass = densityHeight[resolvedDensity];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Card variant="glass" className="overflow-hidden">
        <div ref={parentRef} className={cn('overflow-auto', shouldVirtualize && 'max-h-[600px]')}>
          <table className="w-full border-collapse">
            <thead className={cn(stickyHeader && 'sticky top-0 z-10 bg-[var(--neutral-100)]')}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'h-11 px-4 text-left text-xs uppercase tracking-widest font-semibold text-[var(--neutral-600)] select-none whitespace-nowrap',
                          canSort && 'cursor-pointer hover:text-[var(--neutral-900)]',
                        )}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="transition-transform duration-150">
                              {sorted === 'asc' ? (
                                <ArrowUp size={12} />
                              ) : sorted === 'desc' ? (
                                <ArrowDown size={12} />
                              ) : (
                                <ArrowUpDown size={12} className="opacity-40" />
                              )}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody
              style={shouldVirtualize ? { height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' } : undefined}
            >
              {shouldVirtualize
                ? rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    return (
                      <TableRow
                        key={row.id}
                        row={row}
                        rowHeightClass={rowHeightClass}
                        {...(onRowClick ? { onRowClick } : {})}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      />
                    );
                  })
                : rows.map((row) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      rowHeightClass={rowHeightClass}
                      {...(onRowClick ? { onRowClick } : {})}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {pagination && (
        <Pagination
          page={pagination.pageIndex + 1}
          totalPages={Math.ceil(pagination.total / pagination.pageSize)}
          onPageChange={(p) => pagination.onChange({ pageIndex: p - 1, pageSize: pagination.pageSize })}
        />
      )}
    </div>
  );
}

// Inner row component to keep JSX clean
interface TableRowProps<TData> {
  row: Row<TData>;
  rowHeightClass: string;
  onRowClick?: (row: TData) => void;
  style?: React.CSSProperties;
}

function TableRow<TData>({ row, rowHeightClass, onRowClick, style }: TableRowProps<TData>) {
  const [pressing, setPressing] = React.useState(false);

  return (
    <tr
      style={style}
      className={cn(
        'border-t border-[var(--neutral-100)] group relative',
        'hover:bg-[var(--neutral-50)]',
        onRowClick && 'cursor-pointer',
        pressing && 'scale-[0.999]',
        'transition-[background-color,transform] duration-[60ms]',
      )}
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
      onMouseDown={() => onRowClick && setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
    >
      {/* Left accent border on hover */}
      <td
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-0 border-l-[3px] border-[var(--brand-accent)] opacity-0 group-hover:opacity-100 transition-all duration-150 scale-y-0 group-hover:scale-y-100 origin-center"
      />
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className={cn('px-4 text-[var(--text-sm)] text-[var(--neutral-800)] truncate max-w-[200px]', rowHeightClass)}
          title={typeof cell.getValue() === 'string' ? (cell.getValue() as string) : undefined}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}
