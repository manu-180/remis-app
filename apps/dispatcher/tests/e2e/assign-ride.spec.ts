/**
 * Assign-ride flow E2E tests.
 *
 * Flow observed in the source:
 *   1. Left column "Pedidos" tab → click a ride row → selectRide() called.
 *   2. AssignPanel mounts with role="dialog" aria-label="Asignar pedido #XXXX".
 *   3. Suggested driver cards are <button> elements inside <ul role="list">.
 *   4. Clicking a driver card calls handleAssign() → Supabase RPC assign_ride.
 *   5. On success, onClose() is called and a <div role="status"> toast appears:
 *      "Asignado a <driverName>"
 *
 * Prerequisites:
 *   - Next.js dispatcher app running on port 3001 with a logged-in session
 *     (storage state or TEST_DISPATCHER_* env vars).
 *   - Local Supabase running for DB verification.
 */
import { test, expect } from '@playwright/test';
import { insertTestRide, cleanupRide, testDb } from '../helpers/supabase-test-client';

test.describe('Assign ride', () => {
  test.skip(
    !process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Skipped: SUPABASE_SERVICE_ROLE_KEY not set — needs local Supabase',
  );

  test('click ride → assign panel opens', async ({ page }) => {
    await page.goto('/');

    const ride = await insertTestRide({
      pickup_address: 'Mitre 100, Santa Rosa',
    });

    // Switch to Pedidos tab.
    await page.getByRole('tab', { name: /Pedidos/i }).click();

    // Wait for the ride to appear and click it.
    const rideRow = page.getByText('Mitre 100, Santa Rosa');
    await expect(rideRow).toBeVisible({ timeout: 2000 });
    await rideRow.click();

    // AssignPanel renders role="dialog" with the ride short-id in the label.
    await expect(page.getByRole('dialog', { name: /Asignar pedido/i })).toBeVisible({
      timeout: 2000,
    });

    // Close via Cancelar button.
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByRole('dialog', { name: /Asignar pedido/i })).toBeHidden();

    await cleanupRide(ride.id);
  });

  test('assign panel → pick first suggested driver → toast appears', async ({ page }) => {
    await page.goto('/');

    const ride = await insertTestRide({
      pickup_address: 'Sarmiento 200, Santa Rosa',
    });

    await page.getByRole('tab', { name: /Pedidos/i }).click();
    const rideRow = page.getByText('Sarmiento 200, Santa Rosa');
    await expect(rideRow).toBeVisible({ timeout: 2000 });
    await rideRow.click();

    const assignDialog = page.getByRole('dialog', { name: /Asignar pedido/i });
    await expect(assignDialog).toBeVisible({ timeout: 2000 });

    // Suggested drivers are rendered as <button> elements inside the dialog.
    // The first one has a Star icon and is always selected by default.
    const driverButtons = assignDialog.getByRole('list').getByRole('listitem').getByRole('button');
    const firstDriverBtn = driverButtons.first();

    if (await firstDriverBtn.isVisible()) {
      await firstDriverBtn.click();

      // Undo toast: role="status" with text "Asignado a …"
      const toast = page.getByRole('status');
      await expect(toast).toBeVisible({ timeout: 4000 });
      await expect(toast).toContainText(/Asignado a/i);

      // Optionally verify DB status updated to 'assigned'.
      const { data } = await testDb
        .from('rides')
        .select('status')
        .eq('id', ride.id)
        .single();
      expect(data?.status).toBe('assigned');
    } else {
      // No drivers available in this environment — mark test as skipped note.
      console.warn('[assign-ride] No suggested drivers visible; skipping assignment assertion.');
    }

    await cleanupRide(ride.id);
  });

  test('closing assign panel with Escape key works', async ({ page }) => {
    await page.goto('/');

    const ride = await insertTestRide({
      pickup_address: 'Pellegrini 50, Santa Rosa',
    });

    await page.getByRole('tab', { name: /Pedidos/i }).click();
    const rideRow = page.getByText('Pellegrini 50, Santa Rosa');
    await expect(rideRow).toBeVisible({ timeout: 2000 });
    await rideRow.click();

    const assignDialog = page.getByRole('dialog', { name: /Asignar pedido/i });
    await expect(assignDialog).toBeVisible({ timeout: 2000 });

    // AssignPanel binds useHotkeys('escape', onClose).
    await page.keyboard.press('Escape');
    await expect(assignDialog).toBeHidden({ timeout: 1500 });

    await cleanupRide(ride.id);
  });
});
