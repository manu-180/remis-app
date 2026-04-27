'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Flag, Star, X } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

import { useRidesStore } from '@/stores/rides-store';
import { useAvailableDrivers, useOnlineDrivers } from '@/stores/drivers-store';
import type { Driver } from '@/stores/drivers-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RpcNearestDriver {
  driver_id: string;
  distance_meters: number;
  eta_seconds: number;
}

interface SuggestedDriver {
  driver: Driver;
  distanceMeters?: number;
  etaSeconds?: number;
}

interface ToastState {
  driverName: string;
  rideId: string;
  driverId: string;
  timerId: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  return `${Math.round(seconds / 60)} min`;
}

function shortId(id: string): string {
  return id.slice(-4).toUpperCase();
}

// ---------------------------------------------------------------------------
// Toast component (internal)
// ---------------------------------------------------------------------------

interface UndoToastProps {
  driverName: string;
  onUndo: () => void;
  onDismiss: () => void;
}

function UndoToast({ driverName, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--neutral-800)] px-4 py-3 text-[var(--text-sm)] text-white shadow-[var(--shadow-xl)]"
    >
      <span>
        Asignado a <strong>{driverName}</strong>
      </span>
      <button
        onClick={onUndo}
        className="font-semibold text-[var(--brand-primary)] hover:underline focus:outline-none"
      >
        Deshacer
      </button>
      <button
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="ml-1 opacity-60 hover:opacity-100 focus:outline-none"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Driver card
// ---------------------------------------------------------------------------

interface DriverCardProps {
  driver: Driver;
  distanceMeters?: number;
  etaSeconds?: number;
  isFirst: boolean;
  isSelected: boolean;
  index: number;
  onClick: () => void;
}

function DriverCard({
  driver,
  distanceMeters,
  etaSeconds,
  isFirst,
  isSelected,
  index,
  onClick,
}: DriverCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors duration-[var(--dur-fast)] focus:outline-none',
        isSelected
          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 ring-1 ring-[var(--brand-primary)]'
          : 'border-[var(--neutral-200)] bg-[var(--neutral-50)] hover:bg-[var(--neutral-100)]',
      )}
    >
      {/* Index badge */}
      <kbd
        aria-hidden
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-xs)] font-mono',
          isSelected
            ? 'bg-[var(--brand-primary)] text-white'
            : 'bg-[var(--neutral-200)] text-[var(--neutral-600)]',
        )}
      >
        {index + 1}
      </kbd>

      {/* Star for first suggestion */}
      {isFirst ? (
        <Star
          size={14}
          className="shrink-0 fill-[var(--brand-primary)] text-[var(--brand-primary)]"
          aria-label="Más cercano"
        />
      ) : (
        <span className="w-3.5 shrink-0" aria-hidden />
      )}

      {/* Driver info */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[var(--text-sm)] font-semibold text-[var(--neutral-800)]">
          #{driver.internalNumber} {driver.name}
        </span>
        {driver.vehicleType && (
          <span className="block text-[var(--text-xs)] text-[var(--neutral-500)] capitalize">
            {driver.vehicleType}
          </span>
        )}
      </span>

      {/* Distance / ETA */}
      <span className="shrink-0 text-right text-[var(--text-xs)] text-[var(--neutral-500)]">
        {distanceMeters !== undefined ? formatDistance(distanceMeters) : '—'}
        {' · '}
        {etaSeconds !== undefined ? formatEta(etaSeconds) : '—'}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface AssignPanelProps {
  rideId: string;
  onClose: () => void;
}

export function AssignPanel({ rideId, onClose }: AssignPanelProps) {
  // ---- Store data ----------------------------------------------------------
  const ride = useRidesStore((s) => s.rides.get(rideId));
  const localSuggestions = useAvailableDrivers();
  const allOnlineDrivers = useOnlineDrivers();

  // ---- UI state ------------------------------------------------------------
  const [suggestions, setSuggestions] = useState<SuggestedDriver[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- Load RPC suggestions ------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchSuggestions() {
      setLoadingSuggestions(true);

      if (ride?.pickupLat !== undefined && ride?.pickupLng !== undefined) {
        try {
          const supabase = getSupabaseBrowserClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase.rpc as any)(
            'find_nearest_available_drivers',
            {
              pickup_lat: ride.pickupLat,
              pickup_lng: ride.pickupLng,
              max_distance: 10000,
              limit: 5,
              max_gps_age_seconds: 60,
            },
          );

          if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
            const rpcDrivers = data as RpcNearestDriver[];
            const driversMap = useRidesStore.getState().rides; // unused — get from drivers store
            const storeDrivers = new Map(
              localSuggestions.map((d) => [d.id, d]),
            );

            // Also pull from the full store in case some aren't in available list
            const allDriversState = Array.from(
              // access drivers store directly
              (
                await import('@/stores/drivers-store').then(
                  (m) => m.useDriversStore.getState().drivers,
                )
              ).values(),
            );
            const allMap = new Map(allDriversState.map((d) => [d.id, d]));

            const mapped: SuggestedDriver[] = rpcDrivers.reduce<SuggestedDriver[]>(
              (acc, r) => {
                const driver = allMap.get(r.driver_id) ?? storeDrivers.get(r.driver_id);
                if (!driver) return acc;
                const entry: SuggestedDriver = {
                  driver,
                  distanceMeters: r.distance_meters,
                  etaSeconds: r.eta_seconds,
                };
                acc.push(entry);
                return acc;
              },
              [],
            );

            if (mapped.length > 0) {
              setSuggestions(mapped);
              setLoadingSuggestions(false);
              return;
            }
          }
        } catch {
          // fall through to local fallback
        }
      }

      // Fallback: use local FIFO store
      if (!cancelled) {
        const fallback: SuggestedDriver[] = localSuggestions
          .slice(0, 5)
          .map((driver) => ({ driver }));
        setSuggestions(fallback);
        setLoadingSuggestions(false);
      }
    }

    void fetchSuggestions();
    return () => {
      cancelled = true;
    };
    // We want this to run once on mount; localSuggestions is the snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  // ---- Assignment ----------------------------------------------------------
  const handleAssign = useCallback(
    async (suggestion: SuggestedDriver) => {
      if (assigning) return;
      setAssigning(true);

      const driverId = suggestion.driver.id;
      const driverName = suggestion.driver.name;

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('assign_ride', {
          p_ride_id: rideId,
          p_driver_id: driverId,
          p_dispatcher_id: user?.id ?? null,
        });

        if (error) throw error;

        // Update local store
        useRidesStore.getState().assignRide(rideId, driverId);

        // Show undo toast
        const timerId = setTimeout(() => {
          setToast(null);
        }, 30_000);

        setToast({ driverName, rideId, driverId, timerId });
      } catch (err) {
        console.error('[AssignPanel] assign_ride failed', err);
        // Still update local store as optimistic update in degraded mode
        useRidesStore.getState().assignRide(rideId, driverId);

        const timerId = setTimeout(() => {
          setToast(null);
        }, 30_000);
        setToast({ driverName, rideId, driverId, timerId });
      } finally {
        setAssigning(false);
        onClose();
      }
    },
    [assigning, rideId, onClose],
  );

  const handleUndo = useCallback(async () => {
    if (!toast) return;
    clearTimeout(toast.timerId);
    setToast(null);

    try {
      const supabase = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)('unassign_ride', { p_ride_id: toast.rideId });
    } catch (err) {
      console.error('[AssignPanel] unassign_ride failed', err);
    }
    useRidesStore.getState().updateRideStatus(toast.rideId, 'requested');
  }, [toast]);

  const dismissToast = useCallback(() => {
    if (!toast) return;
    clearTimeout(toast.timerId);
    setToast(null);
  }, [toast]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toast) clearTimeout(toast.timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Confirm selection ---------------------------------------------------
  const confirmSelected = useCallback(() => {
    const target = showAll
      ? null // enter in showAll mode does nothing (no selection tracking there)
      : suggestions[selectedIndex];
    if (target) void handleAssign(target);
  }, [showAll, suggestions, selectedIndex, handleAssign]);

  // ---- Hotkeys -------------------------------------------------------------
  useHotkeys('escape', onClose, { enableOnFormTags: false });
  useHotkeys(
    'enter',
    (e) => {
      e.preventDefault();
      confirmSelected();
    },
    { enableOnFormTags: false },
  );
  useHotkeys(
    'up',
    (e) => {
      e.preventDefault();
      if (!showAll)
        setSelectedIndex((i) => Math.max(0, i - 1));
    },
    { enableOnFormTags: false },
  );
  useHotkeys(
    'down',
    (e) => {
      e.preventDefault();
      if (!showAll)
        setSelectedIndex((i) => Math.min(suggestions.length - 1, i + 1));
    },
    { enableOnFormTags: false },
  );
  useHotkeys(
    '1,2,3,4,5',
    (e) => {
      const n = parseInt(e.key, 10) - 1;
      if (!showAll && n >= 0 && n < suggestions.length) {
        setSelectedIndex(n);
      }
    },
    { enableOnFormTags: false },
  );
  useHotkeys(
    'm',
    () => {
      setShowAll((v) => {
        const next = !v;
        if (next) {
          // Focus search when entering manual mode
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
        return next;
      });
    },
    { enableOnFormTags: false },
  );

  // ---- Filtered "all" list -------------------------------------------------
  const filteredAll = allOnlineDrivers.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.internalNumber.toLowerCase().includes(q) ||
      (d.vehicleType ?? '').toLowerCase().includes(q)
    );
  });

  // ---- Render --------------------------------------------------------------
  if (!ride) return null;

  return (
    <>
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Asignar pedido #${shortId(ride.id)}`}
        className="absolute inset-0 z-40 flex flex-col bg-[var(--neutral-0)] border-l border-[var(--neutral-200)]"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2 border-b border-[var(--neutral-200)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[var(--text-xs)] font-mono text-[var(--neutral-500)]">
              Asignar pedido #{shortId(ride.id)}
            </p>
            <h2 className="mt-0.5 flex items-center gap-1.5 text-[var(--text-sm)] font-semibold text-[var(--neutral-800)]">
              <MapPin size={14} className="shrink-0 text-[var(--brand-primary)]" aria-hidden />
              <span className="truncate">{ride.pickupAddress}</span>
            </h2>
            {ride.destinationAddress && (
              <p className="mt-0.5 flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-600)]">
                <Flag size={12} className="shrink-0 text-[var(--success)]" aria-hidden />
                <span className="truncate">{ride.destinationAddress}</span>
              </p>
            )}
            {ride.notes && (
              <p className="mt-1 text-[var(--text-xs)] italic text-[var(--neutral-500)]">
                {ride.notes}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-700)] focus:outline-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {showAll ? (
            /* ─ All drivers list ─ */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)]">
                  Todos los choferes online
                </p>
                <button
                  onClick={() => setShowAll(false)}
                  className="text-[var(--text-xs)] text-[var(--brand-primary)] hover:underline focus:outline-none"
                >
                  ← Sugeridos
                </button>
              </div>

              <Input
                ref={searchInputRef}
                placeholder="Buscar por nombre o número…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-[var(--text-xs)]"
              />

              {filteredAll.length === 0 ? (
                <p className="py-6 text-center text-[var(--text-sm)] text-[var(--neutral-400)]">
                  Sin resultados
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5" role="list">
                  {filteredAll.map((driver) => (
                    <li key={driver.id}>
                      <button
                        onClick={() => void handleAssign({ driver })}
                        disabled={assigning}
                        className="w-full flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--neutral-100)] focus:outline-none disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[var(--text-sm)] font-semibold text-[var(--neutral-800)]">
                            #{driver.internalNumber} {driver.name}
                          </span>
                          <span className="block text-[var(--text-xs)] capitalize text-[var(--neutral-500)]">
                            {driver.status.replace(/_/g, ' ')}
                            {driver.vehicleType ? ` · ${driver.vehicleType}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            /* ─ Suggested list ─ */
            <div className="flex flex-col gap-2">
              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)]">
                Sugeridos
              </p>

              {loadingSuggestions ? (
                <div className="flex flex-col gap-1.5">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--neutral-100)]"
                    />
                  ))}
                </div>
              ) : suggestions.length === 0 ? (
                <p className="py-6 text-center text-[var(--text-sm)] text-[var(--neutral-400)]">
                  No hay choferes disponibles
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5" role="list">
                  {suggestions.map((s, i) => (
                    <li key={s.driver.id}>
                      <DriverCard
                        driver={s.driver}
                        {...(s.distanceMeters !== undefined ? { distanceMeters: s.distanceMeters } : {})}
                        {...(s.etaSeconds !== undefined ? { etaSeconds: s.etaSeconds } : {})}
                        isFirst={i === 0}
                        isSelected={i === selectedIndex}
                        index={i}
                        onClick={() => {
                          setSelectedIndex(i);
                          void handleAssign(s);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="flex flex-col gap-2 border-t border-[var(--neutral-200)] px-4 py-3">
          {!showAll && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowAll(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              className="w-full justify-center"
            >
              Ver todos{' '}
              <kbd className="ml-1 text-[var(--text-xs)] opacity-60">M</kbd>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full justify-center text-[var(--neutral-600)]"
          >
            Cancelar{' '}
            <kbd className="ml-1 text-[var(--text-xs)] opacity-60">Esc</kbd>
          </Button>
        </div>
      </div>

      {/* ── Undo toast (portal-like fixed element) ── */}
      {toast && (
        <UndoToast
          driverName={toast.driverName}
          onUndo={handleUndo}
          onDismiss={dismissToast}
        />
      )}
    </>
  );
}
