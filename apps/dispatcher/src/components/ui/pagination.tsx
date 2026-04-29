'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <nav aria-label="Paginación" className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-150"
      >
        <ChevronLeft size={14} />
      </button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-8 w-8 items-center justify-center text-[var(--neutral-400)]"
          >
            <MoreHorizontal size={14} />
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-sm)] tabular transition-colors duration-150',
              p === page
                ? 'bg-[var(--brand-primary)] text-white font-medium'
                : 'border border-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Página siguiente"
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-150"
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}
