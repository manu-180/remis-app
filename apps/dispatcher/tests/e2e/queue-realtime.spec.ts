/**
 * Realtime queue E2E tests.
 *
 * Prerequisites (must be running):
 *   - Next.js dispatcher app  (npm run dev  → port 3001)
 *   - Local Supabase          (supabase start)
 *
 * The left column "Pedidos" tab shows a list of active rides.
 * Each ride row renders:
 *   {ride.passenger?.name ?? 'Pasajero'} · {ride.pickupAddress}
 *
 * When a new ride is inserted via the service-role client, the Supabase
 * realtime subscription in the rides-store should push it to the UI within ~2 s.
 */
import { test, expect } from '@playwright/test';
import { insertTestRide, cleanupRide } from '../helpers/supabase-test-client';

test.describe('Queue realtime', () => {
  test.skip(
    !process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Skipped: SUPABASE_SERVICE_ROLE_KEY not set — needs local Supabase',
  );

  test('new ride appears in the Pedidos queue within 2 seconds', async ({ page }) => {
    await page.goto('/');

    // Switch to the Pedidos tab in the left column.
    await page.getByRole('tab', { name: /Pedidos/i }).click();

    // Insert a test ride directly via service-role key.
    const ride = await insertTestRide({
      pickup_address: 'Av. San Martín 123, Santa Rosa',
    });

    // The ride row renders the pickup address in a <p> element.
    await expect(
      page.getByText('Av. San Martín 123, Santa Rosa'),
    ).toBeVisible({ timeout: 2000 });

    await cleanupRide(ride.id);
  });

  test('cancelled ride disappears from queue', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Pedidos/i }).click();

    const ride = await insertTestRide({
      pickup_address: 'Corrientes 789, Santa Rosa',
    });

    // Confirm it's visible first.
    await expect(
      page.getByText('Corrientes 789, Santa Rosa'),
    ).toBeVisible({ timeout: 2000 });

    // Cancel via service role.
    const { testDb } = await import('../helpers/supabase-test-client');
    await testDb
      .from('rides')
      .update({ status: 'cancelled_by_dispatcher' })
      .eq('id', ride.id);

    // Active rides filter excludes cancelled — row should disappear.
    await expect(
      page.getByText('Corrientes 789, Santa Rosa'),
    ).toBeHidden({ timeout: 2000 });

    await cleanupRide(ride.id);
  });
});
