'use client';

import { useState, useCallback } from 'react';
import { useFares } from '@/hooks/use-fares';
import type { FareFilter, Fare } from '@/hooks/use-fares';
import { useZones } from '@/hooks/use-zones';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FareMatrix } from './fare-matrix';
import { FareSimulator } from './fare-simulator';

// ---------------------------------------------------------------------------
// Night surcharge tab
// ---------------------------------------------------------------------------
interface NightSurchargeTabProps {
  fares: Fare[];
  isLoading: boolean;
  onUpsertAll: (pct: number) => Promise<void>;
}

function NightSurchargeTab({ fares, isLoading, onUpsertAll }: NightSurchargeTabProps) {
  const firstFare = fares[0];
  const [value, setValue] = useState<string>(
    firstFare ? String(firstFare.night_surcharge_pct) : '0',
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const pct = parseFloat(value);
    if (isNaN(pct) || pct < 0) return;
    setSaving(true);
    try {
      await onUpsertAll(pct);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-xs">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xs">
      <p className="text-sm text-[var(--neutral-500)]">
        Este porcentaje se aplica a <strong>todas</strong> las tarifas vigentes en horario
        nocturno.
        {typeof firstFare?.night_surcharge_pct === 'number' && (
          <>
            {' '}
            Valor actual: <strong>{firstFare.night_surcharge_pct}%</strong>.
          </>
        )}
      </p>
      <div className="space-y-1">
        <Label htmlFor="night-pct" className="text-xs text-[var(--neutral-500)]">
          Recargo nocturno global (%)
        </Label>
        <Input
          id="night-pct"
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full"
        />
      </div>
      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || fares.length === 0}
        variant={saved ? 'secondary' : 'primary'}
      >
        {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar en todas las tarifas'}
      </Button>
      {fares.length === 0 && (
        <p className="text-xs text-[var(--neutral-400)]">
          No hay tarifas vigentes. Primero configurá la matriz.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------
const FILTER_OPTIONS = [
  { value: 'current', label: 'Vigentes' },
  { value: 'all', label: 'Histórico' },
  { value: 'scheduled', label: 'Programadas' },
];

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------
export function FaresClient() {
  const [filter, setFilter] = useState<FareFilter>('current');
  const { fares, isLoading: faresLoading, upsertFare, estimateFare } = useFares(filter);
  const { zones, isLoading: zonesLoading } = useZones();

  const handleUpsert = useCallback(
    async (input: Omit<Fare, 'id'>) => {
      await upsertFare(input);
    },
    [upsertFare],
  );

  const handleUpsertAllNight = useCallback(
    async (pct: number) => {
      await Promise.all(
        fares.map((fare) =>
          upsertFare({
            origin_zone_id: fare.origin_zone_id,
            dest_zone_id: fare.dest_zone_id,
            base_amount_ars: fare.base_amount_ars,
            per_km_ars: fare.per_km_ars,
            flat_amount_ars: fare.flat_amount_ars,
            night_surcharge_pct: pct,
            effective_from: fare.effective_from,
            effective_to: fare.effective_to,
          }),
        ),
      );
    },
    [fares, upsertFare],
  );

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--neutral-500)]">Vigencia</span>
        <Select
          options={FILTER_OPTIONS}
          value={filter}
          onValueChange={(v) => setFilter(v as FareFilter)}
          className="w-40"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matriz</TabsTrigger>
          <TabsTrigger value="night">Recargo nocturno</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <FareMatrix
            zones={zonesLoading ? [] : zones}
            fares={fares}
            filter={filter}
            onUpsert={handleUpsert}
            isLoading={faresLoading || zonesLoading}
          />
        </TabsContent>

        <TabsContent value="night" className="mt-4">
          <NightSurchargeTab
            fares={fares}
            isLoading={faresLoading}
            onUpsertAll={handleUpsertAllNight}
          />
        </TabsContent>
      </Tabs>

      {/* Simulator always visible */}
      <FareSimulator estimateFare={estimateFare} zones={zones} />
    </div>
  );
}
