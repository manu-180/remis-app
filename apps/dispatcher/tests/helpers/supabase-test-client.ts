/**
 * Supabase test client using the service-role key.
 * Requires a running local Supabase instance (supabase start) or a remote
 * project. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before
 * running E2E tests.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const testDb = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function cleanupRide(rideId: string) {
  await testDb.from('rides').delete().eq('id', rideId);
}

export async function insertTestRide(overrides: Record<string, unknown> = {}) {
  const rideId = crypto.randomUUID();
  const { data, error } = await testDb
    .from('rides')
    .insert({
      id: rideId,
      status: 'requested',
      pickup_address: 'Av. San Martín 123, Santa Rosa',
      dest_address: 'Belgrano 456, Santa Rosa',
      passenger_id:
        process.env.TEST_PASSENGER_ID ?? '00000000-0000-0000-0000-000000000001',
      requested_at: new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
