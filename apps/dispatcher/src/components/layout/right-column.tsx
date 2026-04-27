'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHotkeys } from 'react-hotkeys-hook';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Tab = 'new-ride' | 'queue' | 'scheduled';

const newRideSchema = z.object({
  phone:         z.string().min(7, 'Teléfono requerido'),
  passengerName: z.string().min(2, 'Nombre requerido'),
  pickup:        z.string().min(3, 'Dirección de pickup requerida'),
  destination:   z.string().optional(),
  notes:         z.string().optional(),
});
type NewRideForm = z.infer<typeof newRideSchema>;

const MOCK_QUEUE = [
  { id: 'R001', passenger: 'Juan Rodríguez',  pickup: 'Av. San Martín 123',  status: 'pending'  },
  { id: 'R002', passenger: 'Laura Pérez',      pickup: 'Bv. Pellegrini 456',  status: 'assigned' },
  { id: 'R003', passenger: 'Marcos González',  pickup: 'Calle Mitre 789',     status: 'pending'  },
];

export function RightColumn() {
  const [activeTab, setActiveTab] = useState<Tab>('new-ride');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewRideForm>({
    resolver: zodResolver(newRideSchema),
  });

  useHotkeys(
    'space',
    () => {
      setActiveTab('new-ride');
      document.getElementById('field-phone')?.focus();
    },
    { preventDefault: true, enableOnFormTags: false },
  );

  const onSubmit = (data: NewRideForm) => {
    console.log('Nuevo pedido (mock):', data);
    reset();
  };

  return (
    <aside
      className="flex flex-col border-l border-[var(--neutral-200)] bg-[var(--neutral-50)] overflow-hidden"
      aria-label="Panel derecho"
    >
      <div role="tablist" className="flex border-b border-[var(--neutral-200)]">
        {(
          [
            ['new-ride',   'Nuevo pedido'],
            ['queue',      'Cola (3)'],
            ['scheduled',  'Prog. (2)'],
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

      {activeTab === 'new-ride' && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
          aria-label="Formulario de nuevo pedido"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="field-phone" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Teléfono <kbd className="opacity-60">F3</kbd>
            </label>
            <Input id="field-phone" type="tel" placeholder="02954-XXXXXX" {...register('phone')} />
            {errors.phone && <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.phone.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-name" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Nombre
            </label>
            <Input id="field-name" placeholder="Nombre del pasajero" {...register('passengerName')} />
            {errors.passengerName && <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.passengerName.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-pickup" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Pickup <kbd className="opacity-60">F2</kbd>
            </label>
            <Input id="field-pickup" placeholder="Dirección de pickup" {...register('pickup')} />
            {errors.pickup && <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.pickup.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-destination" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Destino <kbd className="opacity-60">F2 ×2</kbd>
            </label>
            <Input id="field-destination" placeholder="Destino (opcional)" {...register('destination')} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-notes" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Notas
            </label>
            <Input id="field-notes" placeholder="Observaciones" {...register('notes')} />
          </div>

          <div className="mt-auto">
            <Button type="submit" variant="accent" size="lg" className="w-full">
              Cargar pedido <kbd className="text-[var(--text-xs)] opacity-70">F1</kbd>
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'queue' && (
        <ul className="flex-1 overflow-y-auto divide-y divide-[var(--neutral-200)]" aria-label="Cola de pedidos">
          {MOCK_QUEUE.map((ride) => (
            <li
              key={ride.id}
              className="p-3 hover:bg-[var(--neutral-100)] cursor-pointer"
              style={{
                borderLeft: `2px solid ${ride.status === 'pending' ? 'var(--danger)' : 'var(--info)'}`,
              }}
            >
              <p className="text-[var(--text-sm)] font-medium text-[var(--neutral-800)]">
                {ride.passenger}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--neutral-500)]">{ride.pickup}</p>
              <p className="text-[var(--text-xs)] font-[var(--font-family-mono)] text-[var(--neutral-400)]">
                {ride.id}
              </p>
            </li>
          ))}
        </ul>
      )}

      {activeTab === 'scheduled' && (
        <div className="flex-1 flex items-center justify-center text-[var(--neutral-500)] text-[var(--text-sm)]">
          Programados — Tanda 3C
        </div>
      )}
    </aside>
  );
}
