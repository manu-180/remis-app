'use client';

import { useState } from 'react';
import { Car, Calendar, Palette, Tag, RefreshCw } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { DriverWithProfile } from '../driver-profile-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Vehicle = {
  id: string;
  plate: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  vehicle_type: string | null;
  is_active: boolean | null;
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  sedan: 'Sedán',
  suv: 'SUV',
  van: 'Van',
  accessible: 'Accesible',
};

// ---------------------------------------------------------------------------
// Vehicle info card
// ---------------------------------------------------------------------------
function VehicleInfoRow({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--neutral-100)] last:border-b-0">
      <span className="text-[var(--neutral-400)] shrink-0">{icon}</span>
      <span className="text-sm text-[var(--neutral-600)] w-32 shrink-0">{label}</span>
      <span className="text-sm font-medium text-[var(--neutral-900)]">{value || '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface DriverTabVehiculoProps {
  driver: DriverWithProfile;
  onRefresh: () => void;
}

export function DriverTabVehiculo({ driver, onRefresh }: DriverTabVehiculoProps) {
  const [changingVehicle, setChangingVehicle] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseBrowserClient() as any;

  // Load available vehicles
  const { data: availableVehicles, isLoading: vehiclesLoading } = useSupabaseQuery<Vehicle[]>(
    ['vehicles-available'],
    async (supabase) => {
      const result = await supabase
        .from('vehicles')
        .select('id, plate, make, model, color, year, vehicle_type, is_active')
        .eq('is_active', true)
        .order('plate');
      return { data: result.data ?? [], error: result.error };
    },
    { enabled: changingVehicle },
  );

  const vehicleOptions = (availableVehicles ?? [])
    .filter((v) => v.id !== driver.vehicle_id)
    .map((v) => ({
      value: v.id,
      label: [v.plate, [v.make, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' — '),
    }));

  async function handleSaveVehicle() {
    if (!selectedVehicleId) return;
    setSaving(true);
    const { error } = await sb
      .from('drivers')
      .update({ vehicle_id: selectedVehicleId })
      .eq('id', driver.id);
    setSaving(false);
    if (error) {
      toast.error(String(error.message));
      return;
    }
    toast.success('Vehículo actualizado');
    setChangingVehicle(false);
    setSelectedVehicleId('');
    onRefresh();
  }

  const v = driver.vehicles;

  return (
    <div className="space-y-4">
      {v ? (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Vehículo asignado</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChangingVehicle((prev) => !prev)}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Cambiar vehículo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Plate badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--neutral-300)] bg-[var(--neutral-100)] px-4 py-2">
              <span className="font-mono text-2xl font-bold tracking-widest text-[var(--neutral-900)]">
                {v.plate ?? '—'}
              </span>
            </div>

            <VehicleInfoRow label="Marca / Modelo" value={[v.make, v.model].filter(Boolean).join(' ')} icon={<Car size={16} />} />
            <VehicleInfoRow label="Color" value={v.color} icon={<Palette size={16} />} />
            <VehicleInfoRow label="Año" value={v.year?.toString() ?? null} icon={<Calendar size={16} />} />
            <VehicleInfoRow
              label="Tipo"
              value={v.vehicle_type ? VEHICLE_TYPE_LABELS[v.vehicle_type] ?? v.vehicle_type : null}
              icon={<Tag size={16} />}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Car size={32} />}
            title="Sin vehículo asignado"
            description="Este conductor no tiene un vehículo asignado."
            action={{ label: 'Asignar vehículo', onClick: () => setChangingVehicle(true) }}
          />
        </Card>
      )}

      {/* Change vehicle inline */}
      {changingVehicle && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-3">
                <Combobox
                  options={vehicleOptions}
                  value={selectedVehicleId}
                  onValueChange={setSelectedVehicleId}
                  placeholder="Buscar vehículo por patente o modelo..."
                  emptyMessage="No hay vehículos disponibles"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveVehicle}
                    disabled={!selectedVehicleId || saving}
                  >
                    {saving ? 'Guardando...' : 'Confirmar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setChangingVehicle(false); setSelectedVehicleId(''); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
