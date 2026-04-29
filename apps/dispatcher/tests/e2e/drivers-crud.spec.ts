/**
 * Drivers CRUD — tests de interfaz para la página de conductores en el admin.
 *
 * No escribe datos reales en la DB; sólo verifica que la UI responde
 * correctamente a interacciones básicas.
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

test.describe('Drivers CRUD', () => {
  test('admin puede abrir el drawer de nuevo conductor', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/drivers');

    // Espera a que la página cargue
    await page.waitForTimeout(1500);

    // Busca y hace click en el botón "Nuevo conductor"
    const newDriverBtn = page.getByRole('button', { name: /nuevo conductor/i });
    await expect(newDriverBtn).toBeVisible({ timeout: 5000 });
    await newDriverBtn.click();

    // Espera que aparezca el drawer/dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

    // Verifica que hay al menos un campo de formulario dentro del dialog
    const dialog = page.getByRole('dialog');
    const hasInput = await dialog.locator('input').first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasInput).toBe(true);

    // Cierra el drawer con Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
  });

  test('la lista de conductores muestra una tabla', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/drivers');

    // Espera a que los skeletons desaparezcan
    await page.waitForTimeout(2000);

    // La página NO debe mostrar "En construcción"
    await expect(page.getByText('En construcción')).not.toBeVisible();

    // Debe haber alguna estructura de tabla o lista de datos
    const hasTable = await page.locator('[role="table"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasList = await page.locator('table').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasGrid = await page.locator('[role="grid"]').first().isVisible({ timeout: 2000 }).catch(() => false);

    // Al menos una estructura de datos debe estar visible
    expect(hasTable || hasList || hasGrid).toBe(true);
  });
});
