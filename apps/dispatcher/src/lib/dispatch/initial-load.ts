import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Verifies the Supabase connection is live by issuing a lightweight HEAD query.
 * The actual data hydration (rides + drivers) happens inside setupRealtimeChannels
 * via its subscribe callback. This function is the integration point for any
 * explicit pre-fetch logic we may need to add later.
 */
export async function loadInitialDispatchData(): Promise<{ connected: boolean }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('rides')
    .select('id', { count: 'exact', head: true });
  return { connected: !error };
}
