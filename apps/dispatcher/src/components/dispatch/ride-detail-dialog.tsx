'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/button';
import { useRidesStore } from '@/stores/rides-store';
import type { Ride } from '@/stores/rides-store';

// ─── Props ───────────────────────────────────────────────────────────────────

interface RideDetailDialogProps {
  rideId: string;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: Ride['status']): string {
  switch (status) {
    case 'requested':           return 'var(--danger)';
    case 'assigned':            return 'var(--info)';
    case 'en_route_to_pickup':
    case 'waiting_passenger':   return 'var(--warning)';
    case 'on_trip':             return 'var(--success)';
    case 'completed':           return 'var(--neutral-500)';
    default:                    return 'var(--neutral-400)'; // cancelled*
  }
}

function statusLabel(status: Ride['status']): string {
  switch (status) {
    case 'requested':              return 'Solicitado';
    case 'assigned':               return 'Asignado';
    case 'en_route_to_pickup':     return 'En camino';
    case 'waiting_passenger':      return 'Esperando';
    case 'on_trip':                return 'En viaje';
    case 'completed':              return 'Completado';
    case 'cancelled_by_passenger': return 'Cancelado (pasajero)';
    case 'cancelled_by_driver':    return 'Cancelado (chofer)';
    case 'cancelled_by_dispatcher':return 'Cancelado (despacho)';
    case 'no_show':                return 'No show';
    default:                       return status;
  }
}

function paymentLabel(method: Ride['paymentMethod']): string {
  switch (method) {
    case 'cash':        return 'Efectivo';
    case 'mp_checkout': return 'MercadoPago';
    case 'account':     return 'Cuenta';
    default:            return '—';
  }
}

function vehicleLabel(type: Ride['vehicleType']): string {
  switch (type) {
    case 'sedan':      return 'Sedán';
    case 'suv':        return 'SUV';
    case 'van':        return 'Van';
    case 'accessible': return 'Accesible';
    default:           return '—';
  }
}

function requestedViaLabel(via: Ride['requestedVia']): string {
  switch (via) {
    case 'phone': return 'Teléfono';
    case 'app':   return 'App';
    case 'web':   return 'Web';
    default:      return '—';
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RideDetailDialog({ rideId, onClose }: RideDetailDialogProps) {
  const ride = useRidesStore((s) => s.rides.get(rideId));

  // ── Hotkeys ────────────────────────────────────────────────────────────────

  useHotkeys('escape', onClose, { enableOnFormTags: true });

  useHotkeys(
    'e',
    () => { console.log('editar'); },
    { enableOnFormTags: false },
  );

  useHotkeys(
    'r',
    () => {
      if (!ride) return;
      useRidesStore.getState().updateRideStatus(rideId, 'requested');
      onClose();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    'c',
    () => {
      if (!ride) return;
      useRidesStore.getState().updateRideStatus(rideId, 'cancelled_by_dispatcher');
      onClose();
    },
    { enableOnFormTags: false },
  );

  if (!ride) return null;

  const handleCancel = () => {
    useRidesStore.getState().updateRideStatus(rideId, 'cancelled_by_dispatcher');
    onClose();
  };

  const handleReasignar = () => {
    useRidesStore.getState().updateRideStatus(rideId, 'requested');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del viaje #${ride.id.slice(0, 8)}`}
        className="relative bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--neutral-200)] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[var(--text-base)] font-semibold text-[var(--neutral-900)] font-mono">
              #{ride.id.slice(0, 8)}
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-[var(--text-xs)] font-medium text-white"
              style={{ backgroundColor: statusColor(ride.status) }}
            >
              {statusLabel(ride.status)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar (Esc)"
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--neutral-500)] hover:text-[var(--neutral-800)] hover:bg-[var(--neutral-200)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* 1. Passenger info */}
          <section>
            <h3 className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)] mb-2">
              Pasajero
            </h3>
            <div className="flex flex-col gap-1">
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Nombre:</span> {ride.passenger?.name ?? '—'}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Teléfono:</span> {ride.passenger?.phone ?? '—'}
              </p>
            </div>
          </section>

          {/* 2. Route */}
          <section>
            <h3 className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)] mb-2">
              Ruta
            </h3>
            <div className="flex flex-col gap-1">
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">◉ Pickup:</span> {ride.pickupAddress}
              </p>
              {ride.destinationAddress && (
                <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                  <span className="font-medium">⬛ Destino:</span> {ride.destinationAddress}
                </p>
              )}
            </div>
          </section>

          {/* 3. Details */}
          <section>
            <h3 className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)] mb-2">
              Detalles
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Vehículo:</span> {vehicleLabel(ride.vehicleType)}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Pasajeros:</span> {ride.passengerCount ?? 1}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Pago:</span> {paymentLabel(ride.paymentMethod)}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Via:</span> {requestedViaLabel(ride.requestedVia)}
              </p>
              <p className="col-span-2 text-[var(--text-sm)] text-[var(--neutral-800)]">
                <span className="font-medium">Solicitado:</span> {formatDateTime(ride.requestedAt)}
              </p>
              {ride.notes && (
                <p className="col-span-2 text-[var(--text-sm)] text-[var(--neutral-800)]">
                  <span className="font-medium">Notas:</span> {ride.notes}
                </p>
              )}
            </div>
          </section>

          {/* 4. Status */}
          <section>
            <h3 className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)] mb-2">
              Estado
            </h3>
            <span
              className="inline-block px-3 py-1 rounded-full text-[var(--text-sm)] font-medium text-white"
              style={{ backgroundColor: statusColor(ride.status) }}
            >
              {statusLabel(ride.status)}
            </span>
          </section>

          {/* 5. Timeline placeholder */}
          <section>
            <h3 className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--neutral-500)] mb-2">
              Timeline
            </h3>
            <ul className="text-[var(--text-xs)] text-[var(--neutral-400)] italic pl-3 list-disc">
              <li>Timeline de eventos (Tanda 4)</li>
            </ul>
          </section>
        </div>

        {/* Actions footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--neutral-200)] shrink-0">
          <Button variant="destructive" size="sm" onClick={handleCancel}>
            Cancelar viaje <kbd className="ml-1 opacity-60 text-[var(--text-xs)]">C</kbd>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleReasignar}>
            Reasignar <kbd className="ml-1 opacity-60 text-[var(--text-xs)]">R</kbd>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar <kbd className="ml-1 opacity-60 text-[var(--text-xs)]">Esc</kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
