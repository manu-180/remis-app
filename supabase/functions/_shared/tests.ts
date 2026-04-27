// Run: deno test --allow-all supabase/functions/_shared/tests.ts

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// ─── verifyMpSignature ───────────────────────────────────────────────────────

async function verifyMpSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string,
): Promise<boolean> {
  if (!xSignature || !xRequestId || !dataId) return false;
  const parts = Object.fromEntries(xSignature.split(',').map((p: string) => p.split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sigBuf)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  return computed === v1;
}

async function makeSignature(secret: string, xRequestId: string, dataId: string, ts: string): Promise<string> {
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const hash = Array.from(new Uint8Array(sigBuf)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  return `ts=${ts},v1=${hash}`;
}

Deno.test('verifyMpSignature — valid signature returns true', async () => {
  const secret = 'test_secret_abc123';
  const xRequestId = 'req-001';
  const dataId = '12345678';
  const ts = '1700000000';
  const xSig = await makeSignature(secret, xRequestId, dataId, ts);
  assertEquals(await verifyMpSignature(xSig, xRequestId, dataId, secret), true);
});

Deno.test('verifyMpSignature — tampered signature returns false', async () => {
  const secret = 'test_secret_abc123';
  const xSig = 'ts=1700000000,v1=deadbeef00000000000000000000000000000000000000000000000000000000';
  assertEquals(await verifyMpSignature(xSig, 'req-001', '12345678', secret), false);
});

Deno.test('verifyMpSignature — missing fields returns false', async () => {
  assertEquals(await verifyMpSignature(null, 'req-001', '123', 'secret'), false);
  assertEquals(await verifyMpSignature('ts=1,v1=abc', null, '123', 'secret'), false);
  assertEquals(await verifyMpSignature('ts=1,v1=abc', 'req', null, 'secret'), false);
});

// ─── dispatch-fcm mock ───────────────────────────────────────────────────────

Deno.test('dispatchFcm — sends to all tokens (mock fetch)', async () => {
  const sentMessages: unknown[] = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    if (url.includes('fcm.googleapis.com')) {
      sentMessages.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify({ name: 'projects/test/messages/mock-id' }), { status: 200 });
    }
    if (url.includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'mock_token' }), { status: 200 });
    }
    return originalFetch(input, init);
  };

  // Simulate sending to 2 tokens
  const tokens = ['token_a', 'token_b'];
  for (const token of tokens) {
    const payload = {
      message: {
        token,
        notification: { title: 'Test', body: 'Body' },
        data: { type: 'ride_assigned' },
        android: { priority: 'high', notification: { channel_id: 'rides_critical' } },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'pedido.caf' } } },
      },
    };
    const res = await fetch('https://fcm.googleapis.com/v1/projects/test/messages:send', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock_token', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assertEquals(res.status, 200);
  }

  assertEquals(sentMessages.length, 2);
  assertNotEquals(sentMessages[0], sentMessages[1]);

  globalThis.fetch = originalFetch;
});
