'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHotkeys } from 'react-hotkeys-hook';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRidesStore, useActiveRides, useScheduledRides } from '@/stores/rides-store';
import type { Ride } from '@/stores/rides-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
// AssignPanel is implemented in Task 5 — import it now
import { AssignPanel } from '@/components/dispatch/assign-panel';
import { RideDetailDialog } from '@/components/dispatch/ride-detail-dialog';

// ─── Schema ─────────────────────────────────────────────────────────────────

const newRideSchema = z.object({
  phone:          z.string().min(7, 'Teléfono requerido'),
  passengerName:  z.string().min(2, 'Nombre requerido'),
  pickup:         z.string().min(3, 'Dirección de pickup requerida'),
  destination:    z.string().optional(),
  scheduledFor:   z.string().optional(),
  isScheduled:    z.boolean().default(false),
  vehicleType:    z.enum(['sedan', 'suv', 'van', 'accessible']).default('sedan'),
  passengerCount: z.number().min(1).max(7).default(1),
  paymentMethod:  z.enum(['cash', 'mp_checkout', 'account']).default('cash'),
  notes:          z.string().optional(),
});
type NewRideForm = z.infer<typeof newRideSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'new-ride' | 'queue' | 'scheduled';
type QueueFilter = 'all' | 'unassigned' | 'assigned' | 'en_route' | 'scheduled';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'ahora';
  if (diff === 1) return 'hace 1 min';
  return `hace ${diff} min`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function statusBorderColor(status: Ride['status']): string {
  switch (status) {
    case 'requested':            return 'var(--danger)';
    case 'assigned':             return 'var(--info)';
    case 'en_route_to_pickup':
    case 'waiting_passenger':    return 'var(--warning)';
    case 'on_trip':              return 'var(--success)';
    default:                     return 'var(--neutral-300)';
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

// ─── Sub-components ──────────────────────────────────────────────────────────

interface RideCardProps {
  ride: Ride;
  onAssign: (id: string) => void;
  onDetail: (id: string) => void;
}

function RideCard({ ride, onAssign, onDetail }: RideCardProps) {
  return (
    <li
      className="p-3 hover:bg-[var(--neutral-100)] cursor-pointer transition-colors"
      style={{ borderLeft: `3px solid ${statusBorderColor(ride.status)}` }}
      onDoubleClick={() => onDetail(ride.id)}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[var(--text-xs)] font-mono text-[var(--neutral-500)]">
          #{ride.id.slice(0, 8)} · {formatTime(ride.requestedAt)}
        </span>
        <span className="text-[var(--text-xs)] text-[var(--neutral-400)]">
          {formatRelative(ride.requestedAt)}
        </span>
      </div>

      <p className="text-[var(--text-sm)] font-medium text-[var(--neutral-800)] truncate">
        {ride.passenger?.name ?? '—'} · {ride.passenger?.phone ?? '—'}
      </p>

      <p className="text-[var(--text-xs)] text-[var(--neutral-600)] truncate">
        ◉ {ride.pickupAddress}
        {ride.destinationAddress ? ` → ${ride.destinationAddress}` : ''}
      </p>

      <p className="text-[var(--text-xs)] text-[var(--neutral-400)] truncate">
        {vehicleLabel(ride.vehicleType)} · {paymentLabel(ride.paymentMethod)}
        {ride.notes ? ` · "${ride.notes}"` : ''}
      </p>

      <div className="flex gap-2 mt-2">
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAssign(ride.id); }}
        >
          Asignar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDetail(ride.id); }}
        >
          Más
        </Button>
      </div>
    </li>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function RightColumn() {
  const [activeTab, setActiveTab] = useState<Tab>('new-ride');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [assigningRideId, setAssigningRideId] = useState<string | null>(null);
  const [detailRideId, setDetailRideId] = useState<string | null>(null);

  const phoneRef    = useRef<HTMLInputElement | null>(null);
  const pickupRef   = useRef<HTMLInputElement | null>(null);
  const destRef     = useRef<HTMLInputElement | null>(null);
  const submitRef   = useRef<HTMLButtonElement | null>(null);

  const activeRides    = useActiveRides();
  const scheduledRides = useScheduledRides();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<NewRideForm>({
    resolver: zodResolver(newRideSchema),
    defaultValues: {
      isScheduled:    false,
      vehicleType:    'sedan',
      passengerCount: 1,
      paymentMethod:  'cash',
    },
  });

  const isScheduled    = watch('isScheduled');
  const vehicleType    = watch('vehicleType');
  const paymentMethod  = watch('paymentMethod');
  const passengerCount = watch('passengerCount');

  // ── Hotkeys ────────────────────────────────────────────────────────────────

  useHotkeys(
    'space',
    () => {
      setActiveTab('new-ride');
      phoneRef.current?.focus();
    },
    { preventDefault: true, enableOnFormTags: false },
  );

  useHotkeys(
    'f3',
    () => {
      setActiveTab('new-ride');
      phoneRef.current?.focus();
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  useHotkeys(
    'f2',
    () => {
      setActiveTab('new-ride');
      if (document.activeElement === pickupRef.current) {
        destRef.current?.focus();
      } else {
        pickupRef.current?.focus();
      }
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  useHotkeys(
    'f5',
    () => {
      setValue('isScheduled', !isScheduled);
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  useHotkeys(
    'f1',
    () => {
      submitRef.current?.click();
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  useHotkeys(
    'escape',
    () => {
      reset();
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  useHotkeys(
    'enter',
    async () => {
      const valid = await trigger();
      if (valid) submitRef.current?.click();
    },
    { preventDefault: true, enableOnFormTags: true },
  );

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = (data: NewRideForm) => {
    const rideId = crypto.randomUUID();
    const newRide: import('@/stores/rides-store').Ride = {
      id:            rideId,
      status:        'requested',
      requestedAt:   new Date().toISOString(),
      requestedVia:  'phone',
      pickupAddress: data.pickup,
      vehicleType:   data.vehicleType,
      passengerCount: data.passengerCount,
      paymentMethod:  data.paymentMethod,
      passenger:     { id: crypto.randomUUID(), name: data.passengerName, phone: data.phone },
    };
    if (data.destination) newRide.destinationAddress = data.destination;
    if (data.isScheduled && data.scheduledFor) newRide.scheduledFor = data.scheduledFor;
    if (data.notes) newRide.notes = data.notes;
    useRidesStore.getState().upsertRide(newRide);
    reset();

    // Fire-and-forget Supabase insert (DB types are placeholder)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbClient = getSupabaseBrowserClient() as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    void sbClient.from('rides').insert({
      id: rideId, status: 'requested', requested_at: new Date().toISOString(),
      requested_via: 'phone', pickup_address: data.pickup,
      destination_address: data.destination ?? null,
      scheduled_for: data.isScheduled ? (data.scheduledFor ?? null) : null,
      vehicle_type: data.vehicleType, passenger_count: data.passengerCount,
      payment_method: data.paymentMethod, notes: data.notes ?? null,
    });
  };

  // ── Queue filtering ────────────────────────────────────────────────────────

  const filteredRides = activeRides.filter((r) => {
    switch (queueFilter) {
      case 'unassigned': return r.status === 'requested';
      case 'assigned':   return r.status === 'assigned';
      case 'en_route':   return r.status === 'en_route_to_pickup' || r.status === 'waiting_passenger' || r.status === 'on_trip';
      case 'scheduled':  return r.scheduledFor != null;
      default:           return true;
    }
  });

  const queueCount    = activeRides.length;
  const scheduledCount = scheduledRides.length;

  const now30 = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // ── Register refs ──────────────────────────────────────────────────────────

  const phoneRegister  = register('phone');
  const pickupRegister = register('pickup');
  const destRegister   = register('destination');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside
      className="flex flex-col border-l border-[var(--neutral-200)] bg-[var(--neutral-50)] overflow-hidden"
      aria-label="Panel derecho"
    >
      {/* Tab bar */}
      <div role="tablist" className="flex border-b border-[var(--neutral-200)] shrink-0">
        {(
          [
            ['new-ride',  'Nuevo pedido'],
            ['queue',     `Cola (${queueCount})`],
            ['scheduled', `Prog. (${scheduledCount})`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 text-[var(--text-xs)] font-medium transition-colors ${
              activeTab === id
                ? 'border-b-2 border-[var(--brand-primary)] text-[var(--neutral-900)]'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Nuevo pedido ─────────────────────────────────────────────────── */}
      {activeTab === 'new-ride' && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
          aria-label="Formulario de nuevo pedido"
        >
          {/* Phone + Name */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="field-phone" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
                Teléfono <kbd className="opacity-60">F3</kbd>
              </label>
              <Input
                id="field-phone"
                type="tel"
                placeholder="02954-XXXXXX"
                {...phoneRegister}
                ref={(el) => {
                  phoneRegister.ref(el);
                  phoneRef.current = el;
                }}
              />
              {errors.phone && (
                <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="field-name" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
                Nombre
              </label>
              <Input id="field-name" placeholder="Nombre del pasajero" {...register('passengerName')} />
              {errors.passengerName && (
                <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.passengerName.message}</p>
              )}
            </div>
          </div>

          {/* Pickup */}
          <div className="flex flex-col gap-1">
            <label htmlFor="field-pickup" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Pickup <kbd className="opacity-60">F2</kbd>
            </label>
            <Input
              id="field-pickup"
              placeholder="Dirección de pickup"
              {...pickupRegister}
              ref={(el) => {
                pickupRegister.ref(el);
                pickupRef.current = el;
              }}
            />
            {errors.pickup && (
              <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.pickup.message}</p>
            )}
          </div>

          {/* Destination */}
          <div className="flex flex-col gap-1">
            <label htmlFor="field-destination" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Destino <kbd className="opacity-60">F2 ×2</kbd>
            </label>
            <Input
              id="field-destination"
              placeholder="Destino (opcional)"
              {...destRegister}
              ref={(el) => {
                destRegister.ref(el);
                destRef.current = el;
              }}
            />
          </div>

          {/* Schedule toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Horario <kbd className="opacity-60">F5</kbd>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue('isScheduled', false)}
                className={`flex-1 py-1.5 rounded-[var(--radius-md)] text-[var(--text-xs)] font-medium border transition-colors ${
                  !isScheduled
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                    : 'bg-[var(--neutral-0)] text-[var(--neutral-600)] border-[var(--neutral-300)] hover:bg-[var(--neutral-100)]'
                }`}
              >
                Para ahora
              </button>
              <button
                type="button"
                onClick={() => setValue('isScheduled', true)}
                className={`flex-1 py-1.5 rounded-[var(--radius-md)] text-[var(--text-xs)] font-medium border transition-colors ${
                  isScheduled
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                    : 'bg-[var(--neutral-0)] text-[var(--neutral-600)] border-[var(--neutral-300)] hover:bg-[var(--neutral-100)]'
                }`}
              >
                Programar
              </button>
            </div>
            {isScheduled && (
              <Input
                type="datetime-local"
                className="mt-1"
                {...register('scheduledFor')}
              />
            )}
          </div>

          {/* Vehicle type */}
          <div className="flex flex-col gap-1">
            <span className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">Vehículo</span>
            <div className="flex gap-1.5">
              {(['sedan', 'suv', 'van', 'accessible'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue('vehicleType', v)}
                  className={`flex-1 py-1.5 rounded-[var(--radius-md)] text-[var(--text-xs)] font-medium border transition-colors ${
                    vehicleType === v
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'bg-[var(--neutral-0)] text-[var(--neutral-600)] border-[var(--neutral-300)] hover:bg-[var(--neutral-100)]'
                  }`}
                >
                  {v === 'sedan' ? 'Sedán' : v === 'suv' ? 'SUV' : v === 'van' ? 'Van' : 'Accesible'}
                </button>
              ))}
            </div>
          </div>

          {/* Passengers */}
          <div className="flex flex-col gap-1">
            <label htmlFor="field-passengers" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Pasajeros
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setValue('passengerCount', Math.max(1, (passengerCount ?? 1) - 1))}
              >
                −
              </Button>
              <Input
                id="field-passengers"
                type="number"
                min={1}
                max={7}
                className="text-center w-16"
                {...register('passengerCount', { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setValue('passengerCount', Math.min(7, (passengerCount ?? 1) + 1))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Payment */}
          <div className="flex flex-col gap-1">
            <span className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">Pago</span>
            <div className="flex gap-1.5">
              {(['cash', 'mp_checkout', 'account'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setValue('paymentMethod', m)}
                  className={`flex-1 py-1.5 rounded-[var(--radius-md)] text-[var(--text-xs)] font-medium border transition-colors ${
                    paymentMethod === m
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'bg-[var(--neutral-0)] text-[var(--neutral-600)] border-[var(--neutral-300)] hover:bg-[var(--neutral-100)]'
                  }`}
                >
                  {m === 'cash' ? 'Efectivo' : m === 'mp_checkout' ? 'MercadoPago' : 'Cuenta'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="field-notes" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Notas
            </label>
            <Input id="field-notes" placeholder="Observaciones" {...register('notes')} />
          </div>

          {/* Submit */}
          <div className="mt-auto pt-2">
            <Button
              ref={submitRef}
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
            >
              Cargar pedido <kbd className="text-[var(--text-xs)] opacity-70">F1</kbd>
            </Button>
          </div>
        </form>
      )}

      {/* ── Cola ─────────────────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filter chips */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 border-b border-[var(--neutral-200)]">
            {(
              [
                ['all',        'Todos'],
                ['unassigned', 'Sin asignar'],
                ['assigned',   'Asignados'],
                ['en_route',   'En curso'],
                ['scheduled',  'Programados'],
              ] as [QueueFilter, string][]
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setQueueFilter(f)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[var(--text-xs)] font-medium border transition-colors shrink-0 ${
                  queueFilter === f
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                    : 'bg-[var(--neutral-0)] text-[var(--neutral-600)] border-[var(--neutral-300)] hover:bg-[var(--neutral-100)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredRides.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[var(--neutral-500)] text-[var(--text-sm)]">
              Sin pedidos
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-[var(--neutral-200)]" aria-label="Cola de pedidos">
              {filteredRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  onAssign={setAssigningRideId}
                  onDetail={(id) => { setDetailRideId(id); console.log('RideDetailDialog:', id); }}
                />
              ))}
            </ul>
          )}

          {assigningRideId && (
            <AssignPanel
              rideId={assigningRideId}
              onClose={() => setAssigningRideId(null)}
            />
          )}
        </div>
      )}

      {/* ── Programados ──────────────────────────────────────────────────── */}
      {activeTab === 'scheduled' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {scheduledRides.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[var(--neutral-500)] text-[var(--text-sm)]">
              Sin pedidos
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-[var(--neutral-200)]" aria-label="Pedidos programados">
              {scheduledRides.map((ride) => {
                const soon = (ride.scheduledFor ?? '') <= now30 && (ride.scheduledFor ?? '') >= new Date().toISOString();
                return (
                  <li
                    key={ride.id}
                    className={`p-3 hover:bg-[var(--neutral-100)] cursor-pointer transition-colors ${
                      soon ? 'border border-[var(--info)] animate-pulse rounded-[var(--radius-md)] mx-2 my-1' : ''
                    }`}
                    style={{ borderLeft: soon ? undefined : `3px solid ${statusBorderColor(ride.status)}` }}
                    onDoubleClick={() => console.log('RideDetailDialog:', ride.id)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[var(--text-xs)] font-mono text-[var(--neutral-500)]">
                        #{ride.id.slice(0, 8)}
                      </span>
                      <span className="text-[var(--text-xs)] font-medium text-[var(--neutral-700)]">
                        {ride.scheduledFor ? formatTime(ride.scheduledFor) : '—'}
                      </span>
                    </div>
                    <p className="text-[var(--text-sm)] font-medium text-[var(--neutral-800)] truncate">
                      {ride.passenger?.name ?? '—'}
                    </p>
                    <p className="text-[var(--text-xs)] text-[var(--neutral-600)] truncate">
                      ◉ {ride.pickupAddress}
                      {ride.destinationAddress ? ` → ${ride.destinationAddress}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {detailRideId && (
        <RideDetailDialog
          rideId={detailRideId}
          onClose={() => setDetailRideId(null)}
        />
      )}
    </aside>
  );
}
