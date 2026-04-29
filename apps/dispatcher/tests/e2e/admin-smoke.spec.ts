/**
 * Admin smoke tests — verifica que el panel de admin carga correctamente
 * y que la navegación principal funciona.
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

test.describe('Admin smoke', () => {
  test('admin puede iniciar sesión y llega al dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('/admin');
    // Verifica que hay al menos un heading en la página
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('el sidebar tiene todos los ítems del menú', async ({ page }) => {
    await loginAsAdmin(page);
    const nav = page.getByRole('navigation');
    await expect(nav).toContainText('Conductores');
    await expect(nav).toContainText('Viajes');
    await expect(nav).toContainText('SOS');
    await expect(nav).toContainText('Pasajeros');
    await expect(nav).toContainText('Pagos');
    await expect(nav).toContainText('Zonas');
    await expect(nav).toContainText('Tarifas');
    await expect(nav).toContainText('KYC');
    await expect(nav).toContainText('Feature Flags');
    await expect(nav).toContainText('Audit Log');
    await expect(nav).toContainText('Equipo');
    await expect(nav).toContainText('Settings');
  });

  test('navegar a /admin/drivers llega a la página de conductores', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/drivers');
    await expect(page).toHaveURL(/admin\/drivers/);
    await expect(page.getByRole('heading', { name: /conductores/i })).toBeVisible({ timeout: 5000 });
  });

  test('navegar a /admin/zones llega a la página de zonas', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/zones');
    await expect(page).toHaveURL('/admin/zones');
    await expect(page.getByRole('heading', { name: /zonas tarifarias/i })).toBeVisible({ timeout: 5000 });
  });

  test('el command palette se abre con Ctrl+K', async ({ page }) => {
    await loginAsAdmin(page);
    await page.keyboard.press('Control+k');

    // El command palette puede usar role="dialog" o un input con placeholder
    const dialog = page.getByRole('dialog');
    const searchInput = page.getByPlaceholder(/buscar/i);
    const isDialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
    const isInputVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    expect(isDialogVisible || isInputVisible).toBe(true);

    await page.keyboard.press('Escape');

    // Verifica que se cerró
    const dialogAfter = await page.getByRole('dialog').isVisible({ timeout: 1000 }).catch(() => false);
    const inputAfter = await page.getByPlaceholder(/buscar/i).isVisible({ timeout: 1000 }).catch(() => false);
    expect(dialogAfter || inputAfter).toBe(false);
  });
});
