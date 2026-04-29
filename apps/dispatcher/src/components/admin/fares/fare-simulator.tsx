'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Moon } from 'lucide-react';
import type { TariffZone } from '@/hooks/use-zones';
import type { EstimateFareResult } from '@/hooks/use-fares';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { parseWktPolygon } from '@/components/admin/zones/zone-editor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FareSimulatorProps {
  estimateFare: (params: {
    pickup_lat: number;
    pickup_lng: number;
    dest_lat: number;
    dest_lng: number;
    at_time?: string;
  }) => Promise<EstimateFareResult>;
  zones: TariffZone[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function centroid(coords: [number, number][]): [number, number] {
  const n = coords.length;
  if (n === 0) return [0, 0];
  return [
    coords.reduce((s, c) => s + c[0], 0) / n,
    coords.reduce((s, c) => s + c[1], 0) / n,
  ];
}

function formatArs(value: number): string {
  return '$' + new Intl.NumberFormat('es-AR').format(Math.round(value));
}

// ---------------------------------------------------------------------------
// Count-up animation hook
// ---------------------------------------------------------------------------
function useCountUp(target: number | null, duration = 600): number {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setDisplayed(0);
      return;
    }
    const start = performance.now();
    const to = target;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayed(Math.round(to * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function FareSimulator({ estimateFare, zones }: FareSimulatorProps) {
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [atTime, setAtTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateFareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const animatedTotal = useCountUp(result ? result.estimated_fare : null);

  const zoneOptions = zones.map((z) => ({ value: z.id, label: z.name }));

  const zoneNameById = useCallback(
    (id: string | null): string => zones.find((z) => z.id === id)?.name ?? 'Desconocida',
    [zones],
  );

  function applyZoneCentroid(
    zoneId: string,
    setLat: (v: string) => void,
    setLng: (v: string) => void,
  ) {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone?.polygon) return;
    const coords = parseWktPolygon(zone.polygon);
    if (coords.length === 0) return;
    const [lng, lat] = centroid(coords);
    setLat(String(lat.toFixed(6)));
    setLng(String(lng.toFixed(6)));
  }

  function setNow() {
    setAtTime(new Date().toISOString().slice(0, 16));
  }

  async function handleCalculate() {
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
      setError('Completá las coordenadas de origen y destino.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params: {
        pickup_lat: number;
        pickup_lng: number;
        dest_lat: number;
        dest_lng: number;
        at_time?: string;
      } = {
        pickup_lat: pLat,
        pickup_lng: pLng,
        dest_lat: dLat,
        dest_lng: dLng,
      };
      if (atTime) {
        params.at_time = new Date(atTime).toISOString();
      }
      const res = await estimateFare(params);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular la tarifa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[var(--neutral-900)]">
          Simulador de tarifa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Origin / Destination grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Origin */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--neutral-700)]">Origen</p>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--neutral-500)]">Usar zona</Label>
              <Select
                options={zoneOptions}
                placeholder="Seleccionar zona…"
                onValueChange={(id) => applyZoneCentroid(id, setPickupLat, setPickupLng)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--neutral-500)]">Latitud</Label>
                <Input
                  type="number"
                  placeholder="-38.00"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--neutral-500)]">Longitud</Label>
                <Input
                  type="number"
                  placeholder="-63.00"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--neutral-700)]">Destino</p>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--neutral-500)]">Usar zona</Label>
              <Select
                options={zoneOptions}
                placeholder="Seleccionar zona…"
                onValueChange={(id) => applyZoneCentroid(id, setDestLat, setDestLng)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--neutral-500)]">Latitud</Label>
                <Input
                  type="number"
                  placeholder="-38.00"
                  value={destLat}
                  onChange={(e) => setDestLat(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--neutral-500)]">Longitud</Label>
                <Input
                  type="number"
                  placeholder="-63.00"
                  value={destLng}
                  onChange={(e) => setDestLng(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Date/time row */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-[var(--neutral-500)]">Fecha y hora</Label>
            <Input
              type="datetime-local"
              value={atTime}
              onChange={(e) => setAtTime(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={setNow}>
            Ahora
          </Button>
        </div>

        {/* Calculate button */}
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => void handleCalculate()}
          disabled={loading}
        >
          {loading ? 'Calculando…' : 'Calcular'}
        </Button>

        {/* Error */}
        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] p-4 space-y-2">
            {/* Zone route */}
            <p className="text-sm font-medium text-[var(--neutral-700)]">
              {zoneNameById(result.origin_zone_id)}{' '}
              <span className="text-[var(--neutral-400)]">→</span>{' '}
              {zoneNameById(result.dest_zone_id)}
            </p>

            {/* Line items */}
            <div className="space-y-1 text-sm text-[var(--neutral-600)]">
              <div className="flex justify-between">
                <span>Tarifa base</span>
                <span>{formatArs(result.base_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Por km
                  {result.distance_km !== null
                    ? ` (${result.distance_km.toFixed(1)} km)`
                    : ''}
                </span>
                <span>{formatArs(result.per_km_amount)}</span>
              </div>
              {result.night_surcharge_amount > 0 && (
                <div className="flex justify-between">
                  <span>Recargo nocturno</span>
                  <span>{formatArs(result.night_surcharge_amount)}</span>
                </div>
              )}
            </div>

            {/* Divider + total */}
            <div className="border-t border-[var(--neutral-200)] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--neutral-900)]">Total</span>
                <span className="text-xl font-bold tabular-nums text-[var(--brand-primary)]">
                  {formatArs(animatedTotal)}
                </span>
              </div>
            </div>

            {/* Night chip */}
            {result.night_surcharge_amount > 0 && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                  <Moon size={12} />
                  Tarifa nocturna +
                  {Math.round(
                    (result.night_surcharge_amount / result.estimated_fare) * 100,
                  )}
                  %
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
