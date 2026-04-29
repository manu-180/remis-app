'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRealtimeTable } from './use-realtime-table';

export type FareFilter = 'current' | 'all' | 'scheduled';

export type Fare = {
  id: string;
  origin_zone_id: string;
  dest_zone_id: string;
  base_amount_ars: number;
  per_km_ars: number;
  flat_amount_ars: number | null;
  night_surcharge_pct: number;
  effective_from: string;
  effective_to: string | null;
};

export type EstimateFareResult = {
  estimated_fare: number;
  origin_zone_id: string | null;
  dest_zone_id: string | null;
  base_amount: number;
  per_km_amount: number;
  night_surcharge_amount: number;
  distance_km: number | null;
};

export function useFares(filter: FareFilter = 'current'): {
  fares: Fare[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  upsertFare: (input: Omit<Fare, 'id'> & { id?: string }) => Promise<Fare>;
  estimateFare: (params: {
    pickup_lat: number;
    pickup_lng: number;
    dest_lat: number;
    dest_lng: number;
    at_time?: string;
  }) => Promise<EstimateFareResult>;
} {
  const [fares, setFares] = useState<Fare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    let query = supabase.from('fares').select('*');

    if (filter === 'current') {
      query = query.or('effective_to.is.null,effective_to.gt.' + new Date().toISOString());
    } else if (filter === 'scheduled') {
      query = query.gt('effective_from', new Date().toISOString());
    }

    query.order('effective_from', { ascending: false }).then(({ data, error: queryError }) => {
      if (cancelled) return;
      if (queryError) {
        setError(new Error(queryError.message));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFares((data as any[]) ?? []);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filter, version]);

  useRealtimeTable('fares', {}, () => {
    refetch();
  });

  const upsertFare = useCallback(
    async (input: Omit<Fare, 'id'> & { id?: string }): Promise<Fare> => {
      const supabase = getSupabaseBrowserClient();

      // Close any existing current fare for this origin/dest pair
      await supabase
        .from('fares')
        .update({ effective_to: new Date().toISOString() })
        .eq('origin_zone_id', input.origin_zone_id)
        .eq('dest_zone_id', input.dest_zone_id)
        .is('effective_to', null);

      const { data, error: insertError } = await supabase
        .from('fares')
        .insert({
          origin_zone_id: input.origin_zone_id,
          dest_zone_id: input.dest_zone_id,
          base_amount_ars: input.base_amount_ars,
          per_km_ars: input.per_km_ars,
          flat_amount_ars: input.flat_amount_ars,
          night_surcharge_pct: input.night_surcharge_pct,
          effective_from: new Date().toISOString(),
          effective_to: null,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any;
    },
    [],
  );

  const estimateFare = useCallback(
    async (params: {
      pickup_lat: number;
      pickup_lng: number;
      dest_lat: number;
      dest_lng: number;
      at_time?: string;
    }): Promise<EstimateFareResult> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc('estimate_fare', {
        pickup_lat: params.pickup_lat,
        pickup_lng: params.pickup_lng,
        dest_lat: params.dest_lat,
        dest_lng: params.dest_lng,
        at_time: params.at_time ?? new Date().toISOString(),
      });
      if (rpcError) throw new Error(rpcError.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any;
    },
    [],
  );

  return { fares, isLoading, error, refetch, upsertFare, estimateFare };
}
