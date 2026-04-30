'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRealtimeTable } from './use-realtime-table';

export type TariffZone = {
  id: string;
  name: string;
  polygon: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type CreateZoneInput = {
  name: string;
  polygon: string;
  priority: number;
  is_active: boolean;
};

export type UpdateZoneInput = Partial<Omit<CreateZoneInput, 'polygon'>> & {
  polygon?: string;
};

export function useZones(): {
  zones: TariffZone[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  create: (input: CreateZoneInput) => Promise<TariffZone>;
  update: (id: string, input: UpdateZoneInput) => Promise<TariffZone>;
  remove: (id: string) => Promise<void>;
} {
  const [zones, setZones] = useState<TariffZone[]>([]);
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

    supabase
      .from('tariff_zones')
      .select('*')
      .order('priority', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(new Error(queryError.message));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setZones((data as any[]) ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  useRealtimeTable('tariff_zones', {}, () => {
    refetch();
  });

  const create = useCallback(async (input: CreateZoneInput): Promise<TariffZone> => {
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: mutError } = await (supabase.from('tariff_zones') as any)
      .insert(input)
      .select()
      .single();
    if (mutError) throw new Error(mutError.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as any;
  }, []);

  const update = useCallback(async (id: string, input: UpdateZoneInput): Promise<TariffZone> => {
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: mutError } = await (supabase.from('tariff_zones') as any)
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (mutError) throw new Error(mutError.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as any;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    const { error: mutError } = await supabase
      .from('tariff_zones')
      .delete()
      .eq('id', id);
    if (mutError) throw new Error(mutError.message);
  }, []);

  return { zones, isLoading, error, refetch, create, update, remove };
}
