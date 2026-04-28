import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { respondError } from '../_shared/errors.ts';
import { createUserClient } from '../_shared/supabase.ts';

// STUB — Tanda 4D implementa el llamado real a MercadoPago
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const userClient = createUserClient(req);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return respondError('Unauthorized', 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respondError('Invalid JSON', 400);
  }

  const { ride_id } = body as { ride_id?: string };
  if (!ride_id) return respondError('ride_id is required', 400);

  return Response.json(
    { init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=MOCK', ride_id },
    { headers: corsHeaders },
  );
});
