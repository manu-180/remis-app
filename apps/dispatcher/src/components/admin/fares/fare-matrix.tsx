'use client';

import { useState, useRef, useCallback } from 'react';
import type { TariffZone } from '@/hooks/use-zones';
import type { Fare, FareFilter } from '@/hooks/use-fares';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FareMatrixProps {
  zones: TariffZone[];
  fares: Fare[];
  filter: FareFilter;
  onUpsert: (input: Omit<Fare, 'id'>) => Promise<void>;
  isLoading: boolean;
}

interface EditingCell {
  originId: string;
  destId: string;
  value: string;
}

type FlashState = 'success' | 'error' | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatArs(value: number): string {
  return '$' + new Intl.NumberFormat('es-AR').format(value);
}

function getCellValue(fares: Fare[], originId: string, destId: string): number | null {
  const fare = fares.find(
    (f) => f.origin_zone_id === originId && f.dest_zone_id === destId,
  );
  if (!fare) return null;
  return fare.flat_amount_ars !== null ? fare.flat_amount_ars : fare.base_amount_ars;
}

function getCellFare(fares: Fare[], originId: string, destId: string): Fare | undefined {
  return fares.find(
    (f) => f.origin_zone_id === originId && f.dest_zone_id === destId,
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function MatrixSkeleton({ count }: { count: number }) {
  const cols = Math.max(count, 3);
  return (
    <div className="overflow-auto rounded-[var(--radius-lg)] border border-[var(--neutral-200)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--neutral-50)]">
            <th className="sticky left-0 z-10 bg-[var(--neutral-50)] px-4 py-3 border-b border-[var(--neutral-200)] min-w-[140px]">
              <Skeleton className="h-4 w-24" />
            </th>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 border-b border-[var(--neutral-200)] min-w-[120px]">
                <Skeleton className="h-4 w-16 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cols }).map((_, row) => (
            <tr key={row} className="border-b border-[var(--neutral-100)] last:border-0">
              <td className="sticky left-0 bg-[var(--neutral-0)] px-4 py-3 border-r border-[var(--neutral-100)]">
                <Skeleton className="h-4 w-16" />
              </td>
              {Array.from({ length: cols }).map((_, col) => (
                <td key={col} className="px-4 py-3 text-center">
                  <Skeleton className="h-4 w-14 mx-auto" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function FareMatrix({ zones, fares, filter, onUpsert, isLoading }: FareMatrixProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [flashMap, setFlashMap] = useState<Record<string, FlashState>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const isReadOnly = filter !== 'current';

  const cellKey = (originId: string, destId: string) => `${originId}:${destId}`;

  const startEdit = useCallback(
    (originId: string, destId: string) => {
      if (isReadOnly) return;
      const current = getCellValue(fares, originId, destId);
      setEditingCell({
        originId,
        destId,
        value: current !== null ? String(current) : '',
      });
      // auto-focus handled by ref + useEffect equivalent via callback ref
    },
    [fares, isReadOnly],
  );

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const { originId, destId, value } = editingCell;
    const numValue = Number(value);
    if (!value || isNaN(numValue) || numValue < 0) {
      setEditingCell(null);
      return;
    }

    setEditingCell(null);
    const key = cellKey(originId, destId);

    const existing = getCellFare(fares, originId, destId);
    try {
      await onUpsert({
        origin_zone_id: originId,
        dest_zone_id: destId,
        base_amount_ars: existing?.base_amount_ars ?? 0,
        per_km_ars: existing?.per_km_ars ?? 0,
        flat_amount_ars: numValue,
        night_surcharge_pct: existing?.night_surcharge_pct ?? 0,
        effective_from: new Date().toISOString(),
        effective_to: null,
      });
      setFlashMap((prev) => ({ ...prev, [key]: 'success' }));
    } catch {
      setFlashMap((prev) => ({ ...prev, [key]: 'error' }));
    }

    setTimeout(() => {
      setFlashMap((prev) => ({ ...prev, [key]: null }));
    }, 1200);
  }, [editingCell, fares, onUpsert]);

  if (isLoading) {
    return <MatrixSkeleton count={zones.length} />;
  }

  if (zones.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-6 py-12 text-center text-sm text-[var(--neutral-500)]">
        No hay zonas definidas. Primero creá zonas en{' '}
        <a href="/admin/zones" className="underline text-[var(--primary-600)]">
          /admin/zones
        </a>
        .
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      {isReadOnly && (
        <p className="mb-2 text-xs text-[var(--neutral-500)]">
          Solo el período <strong>Vigentes</strong> es editable.
        </p>
      )}
      <div className="overflow-auto rounded-[var(--radius-lg)] border border-[var(--neutral-200)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--neutral-50)]">
              <th className="sticky left-0 z-10 bg-[var(--neutral-50)] px-4 py-3 text-left font-medium text-[var(--neutral-600)] border-b border-[var(--neutral-200)]">
                Origen \ Destino
              </th>
              {zones.map((z) => (
                <th
                  key={z.id}
                  className="px-4 py-3 text-center font-medium text-[var(--neutral-600)] border-b border-[var(--neutral-200)] min-w-[120px]"
                >
                  {z.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((originZone) => (
              <tr
                key={originZone.id}
                className="border-b border-[var(--neutral-100)] last:border-0"
              >
                <td className="sticky left-0 bg-[var(--neutral-0)] px-4 py-3 font-medium text-[var(--neutral-700)] border-r border-[var(--neutral-100)]">
                  {originZone.name}
                </td>
                {zones.map((destZone) => {
                  const isDiagonal = originZone.id === destZone.id;
                  const key = cellKey(originZone.id, destZone.id);
                  const isEditing =
                    editingCell?.originId === originZone.id &&
                    editingCell?.destId === destZone.id;
                  const flash = flashMap[key];
                  const displayValue = getCellValue(fares, originZone.id, destZone.id);
                  const fare = getCellFare(fares, originZone.id, destZone.id);

                  if (isDiagonal) {
                    return (
                      <td
                        key={destZone.id}
                        className="px-4 py-3 text-center text-[var(--neutral-400)] text-xs italic"
                        style={{ backgroundColor: 'var(--neutral-100)' }}
                      >
                        intra-zona
                      </td>
                    );
                  }

                  const cellBorder =
                    flash === 'success'
                      ? 'ring-2 ring-green-500'
                      : flash === 'error'
                        ? 'ring-2 ring-red-500'
                        : '';

                  const tooltipText = fare
                    ? `base: ${formatArs(fare.base_amount_ars)} + perKm: ${formatArs(fare.per_km_ars)}/km`
                    : 'Sin tarifa configurada';

                  return (
                    <td
                      key={destZone.id}
                      className={`px-2 py-2 text-center transition-all ${cellBorder}`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="number"
                          autoFocus
                          className="w-24 rounded border border-[var(--primary-400)] px-2 py-1 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] bg-[var(--neutral-0)] text-[var(--neutral-900)]"
                          value={editingCell.value}
                          onChange={(e) =>
                            setEditingCell((prev) =>
                              prev ? { ...prev, value: e.target.value } : null,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          onBlur={() => void commitEdit()}
                          min={0}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => startEdit(originZone.id, destZone.id)}
                              className={`w-full rounded px-2 py-1 text-sm transition-colors ${
                                isReadOnly
                                  ? 'cursor-default text-[var(--neutral-700)]'
                                  : 'cursor-pointer hover:bg-[var(--neutral-100)] text-[var(--neutral-900)]'
                              } ${displayValue === null ? 'text-[var(--neutral-400)]' : ''}`}
                            >
                              {displayValue !== null ? formatArs(displayValue) : '—'}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">{tooltipText}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
