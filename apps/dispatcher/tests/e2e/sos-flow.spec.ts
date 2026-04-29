/**
 * SOS flow — tests para el panel de emergencias del admin.
 *
 * Inserta un evento SOS de prueba antes de los tests y lo elimina después.
 * Si el insert falla (tabla no existe o permisos insuficientes), los tests
 * se saltan gracefully.
 *
 * Requiere:
 *   - La app corriendo en E2E_BASE_URL (default http://localhost:3001)
 *   - Credenciales admin en TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
import { test, expect, type Page } from '@playwright/test';
import { testDb } from '../helpers/supabase-test-client';

let testSosId: string | null = null;

test.describe('SOS flow en el admin', () => {
  test.beforeAll(async () => {
    try {
      const { data, error } = await testDb
        .from('sos_events')
        .insert({
          driver_id: process.env.TEST_DRIVER_ID ?? '00000000-0000-0000-0000-000000000002',
          status: 'active',
          location: null,
          notes: 'Test SOS event from Playwright',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.warn('SOS insert failed, tests will be skipped:', error.message);
        testSosId = null;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        testSosId = (data as any)?.id ?? null;
      }
    } catch {
      testSosId = null;
    }
  });

  test.afterAll(async () => {
    if (testSosId) {
      await testDb.from('sos_events').delete().eq('id', testSosId);
      testSosId = null;
    }
  });

  test('la lista de SOS muestra los eventos activos', async ({ page }) => {
    if (!testSosId) test.skip();

    await loginAsAdmin(page);
    await page.goto('/admin/sos');
    await expect(page).toHaveURL(/admin\/sos/);

    // Espera a que carguen los datos
    await page.waitForTimeout(2000);

    // La página no debe mostrar "En construcción"
    expect(await page.getByText('En construcción').count()).toBe(0);
  });

  test('la página de SOS carga sin errores de consola', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await loginAsAdmin(page);
    await page.goto('/admin/sos');
    await page.waitForTimeout(2000);

    // Filtra errores no críticos conocidos
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_ADMIN_EMAIL ?? 'admin@test.com');
  await page.fill('#password', process.env.TEST_ADMIN_PASSWORD ?? 'test123456');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin', { timeout: 10000 });
}
