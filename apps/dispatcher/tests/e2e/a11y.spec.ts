/**
 * Auditoría de accesibilidad con axe-core sobre las páginas del admin.
 *
 * Falla si aparece alguna violación con `impact: critical`. Las moderadas
 * y menores se reportan como info pero no bloquean el build.
 *
 * Requiere:
 *   - La app corriendo en E2E_BASE_URL (default http://localhost:3001)
 *   - Credenciales admin en TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_ADMIN_EMAIL ?? 'admin@test.com');
  await page.fill('#password', process.env.TEST_ADMIN_PASSWORD ?? 'test123456');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin', { timeout: 10000 });
}

const PAGES = [
  '/admin',
  '/admin/drivers',
  '/admin/rides',
  '/admin/sos',
  '/admin/zones',
  '/admin/fares',
  '/admin/passengers',
  '/admin/payments',
  '/admin/kyc',
  '/admin/feature-flags',
  '/admin/audit',
  '/admin/team',
  '/admin/settings',
];

test.describe('a11y (axe-core) — sin violaciones críticas', () => {
  for (const path of PAGES) {
    test(`a11y: ${path}`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(path);
      // Espera por algún heading para que la página esté hidratada antes de auditar
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');

      if (results.violations.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[a11y ${path}] violaciones: ${results.violations
            .map((v) => `${v.id} (${v.impact ?? 'unknown'})`)
            .join(', ')}`,
        );
      }

      expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
    });
  }
});
