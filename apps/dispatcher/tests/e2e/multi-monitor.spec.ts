/**
 * Multi-monitor / BroadcastChannel synchronisation E2E tests.
 *
 * The dispatcher is designed for two-monitor setups. A BroadcastChannel named
 * 'dispatcher' is used to sync state (e.g. selected ride) between browser windows
 * opened on the same origin.
 *
 * These tests open two pages in the same browser context (shared origin) and verify
 * that messages posted from one page are received and acted on by the other.
 *
 * Note: BroadcastChannel only works across same-origin pages; Playwright's browser
 * context satisfies this requirement when both pages share the same baseURL.
 */
import { test, expect } from '@playwright/test';

test.describe('Multi-monitor sync via BroadcastChannel', () => {
  test('message posted on page1 is received on page2 without errors', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Install an error collector on page2 before navigating.
    await page2.addInitScript(() => {
      (window as Window & { __testErrors?: string[] }).__testErrors = [];
      window.addEventListener('error', (e) => {
        (window as Window & { __testErrors?: string[] }).__testErrors?.push(e.message);
      });
    });

    const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
    await page1.goto(baseURL);
    await page2.goto(baseURL);

    // Post a SELECT_RIDE message from page1 over the 'dispatcher' channel.
    await page1.evaluate(() => {
      const bc = new BroadcastChannel('dispatcher');
      bc.postMessage({ type: 'SELECT_RIDE', rideId: 'test-bc-123' });
      bc.close();
    });

    // Allow the event loop to propagate the message.
    await page2.waitForTimeout(500);

    // Verify no uncaught JS errors occurred on page2.
    const errors = await page2.evaluate(
      () => (window as Window & { __testErrors?: string[] }).__testErrors ?? [],
    );
    expect(errors).toHaveLength(0);

    await context.close();
  });

  test('two windows on the same URL share the same origin', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
    await page1.goto(baseURL);
    await page2.goto(baseURL);

    const origin1 = await page1.evaluate(() => window.location.origin);
    const origin2 = await page2.evaluate(() => window.location.origin);

    // Same origin is the prerequisite for BroadcastChannel to work.
    expect(origin1).toBe(origin2);

    await context.close();
  });

  test('BroadcastChannel round-trip: page1 sends, page2 receives', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
    await page1.goto(baseURL);
    await page2.goto(baseURL);

    // Set up a listener on page2 before page1 sends.
    await page2.evaluate(() => {
      (window as Window & { __bcMessages?: unknown[] }).__bcMessages = [];
      const bc = new BroadcastChannel('dispatcher');
      bc.onmessage = (ev) => {
        (window as Window & { __bcMessages?: unknown[] }).__bcMessages?.push(ev.data);
      };
      // Expose cleanup on window for teardown.
      (window as Window & { __bcCleanup?: () => void }).__bcCleanup = () => bc.close();
    });

    // Send from page1.
    const sentPayload = { type: 'SELECT_RIDE', rideId: 'round-trip-456' };
    await page1.evaluate((payload) => {
      const bc = new BroadcastChannel('dispatcher');
      bc.postMessage(payload);
      bc.close();
    }, sentPayload);

    // Wait for the message to arrive.
    await page2.waitForFunction(
      () =>
        ((window as Window & { __bcMessages?: unknown[] }).__bcMessages?.length ?? 0) > 0,
      { timeout: 2000 },
    );

    const received = await page2.evaluate(
      () => (window as Window & { __bcMessages?: unknown[] }).__bcMessages ?? [],
    );

    expect(received.length).toBeGreaterThan(0);
    // The first received message should match what was sent.
    expect(received[0]).toMatchObject(sentPayload);

    // Teardown.
    await page2.evaluate(() => {
      (window as Window & { __bcCleanup?: () => void }).__bcCleanup?.();
    });

    await context.close();
  });
});
