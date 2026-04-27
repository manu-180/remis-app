import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceRoleClient } from '../_shared/supabase.ts';
import { log } from '../_shared/logger.ts';

async function verifyMpSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string,
): Promise<boolean> {
  if (!xSignature || !xRequestId || !dataId) return false;

  // MP sends: x-signature: ts=<ts>,v1=<hash>
  const parts = Object.fromEntries(xSignature.split(',').map((p) => p.split('=')));
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
  const computed = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return computed === v1;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  const url = new URL(req.url);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const dataId = url.searchParams.get('data.id') ?? (rawBody as Record<string, { id?: string }>)?.data?.id ?? null;
  const action = req.headers.get('x-action') ?? (rawBody as Record<string, unknown>)?.action as string ?? null;

  const secret = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
  const signatureValid = await verifyMpSignature(xSignature, xRequestId, dataId, secret);

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('mp_webhook_events').insert({
    x_request_id: xRequestId,
    data_id: dataId,
    signature_valid: signatureValid,
    raw_body: rawBody,
    action,
  });

  // 23505 = unique_violation (idempotencia por x_request_id)
  if (error?.code === '23505') {
    log('info', 'Duplicate MP webhook ignored', { xRequestId });
    return Response.json({ ok: true, dup: true }, { headers: corsHeaders });
  }

  if (!signatureValid) {
    log('warn', 'Invalid MP webhook signature', { xRequestId, dataId });
    return Response.json({ error: 'invalid signature' }, { status: 401, headers: corsHeaders });
  }

  // Tanda 4D: procesar pago real aquí
  log('info', 'MP webhook received', { xRequestId, dataId, action });

  return Response.json({ ok: true }, { headers: corsHeaders });
});
