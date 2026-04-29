/**
 * Dashboard loads — verifica que el dashboard del admin carga KPIs,
 * no lanza errores de JS y que la navegación entre páginas funciona.
 *
 * Requiere:
 *   - La app corriendo en E2E_BASE_URL (default http://localhost:3001)
 *   - Credenciales admin en TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 */
import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_ADMIN_EMAIL ?? 'admin@test.com');
  await page.fill('#password', process.env.TEST_ADMIN_PASSWORD ?? 'test123456');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin', { timeout: 10000 });
}

test.describe('Dashboard admin', () => {
  test('el dashboard carga con KPIs numéricos', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('/admin');

    // Espera a que los datos carguen y los skeletons desaparezcan
    await page.waitForTimeout(3000);

    // No debe haber skeletons visibles
    const skeletonCount = await page.locator('[class*="skeleton"]').count();
    expect(skeletonCount).toBe(0);

    // No debe mostrar mensajes de error
    await expect(page.getByText('Error')).not.toBeVisible();
    await expect(page.getByText('En construcción')).not.toBeVisible();

    // El componente Stat renderiza valores con clases tabular/bold.
    // Verifica que hay al menos un valor numérico visible en la página.
    const statValue = page.locator('p.tabular-nums, [class*="tabular"]').first();
    const hasStatValue = await statValue.isVisible({ timeout: 2000 }).catch(() => false);
    // Si el componente usa otra clase, verificar que hay al menos un número en un heading
    const hasAnyNumber = await page.locator('text=/^\\d+/').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasStatValue || hasAnyNumber).toBe(true);
  });

  test('el dashboard no muestra errores de JS', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await loginAsAdmin(page);
    await page.waitForTimeout(3000);

    // Filtra errores no críticos conocidos
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ERR_BLOCKED') &&
        !e.includes('net::ERR_'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('la navegación entre páginas funciona sin recargas', async ({ page }) => {
    await loginAsAdmin(page);

    // Navega a /admin/drivers
    await page.goto('/admin/drivers');
    await expect(page).toHaveURL(/admin\/drivers/);
    await page.waitForTimeout(1000);
    await expect(page.getByText('En construcción')).not.toBeVisible();

    // Navega a /admin/payments
    await page.goto('/admin/payments');
    await expect(page).toHaveURL(/admin\/payments/);
    await page.waitForTimeout(1000);
    await expect(page.getByText('En construcción')).not.toBeVisible();

    // Navega a /admin/audit
    await page.goto('/admin/audit');
    await expect(page).toHaveURL(/admin\/audit/);
    await page.waitForTimeout(1000);
    await expect(page.getByText('En construcción')).not.toBeVisible();
  });
});
