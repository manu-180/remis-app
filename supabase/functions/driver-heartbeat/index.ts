import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { respondError } from '../_shared/errors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const userClient = createUserClient(req);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return respondError('Unauthorized', 401);

  const supabase = createServiceRoleClient();
  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!driver) return respondError('Driver not found', 404);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* body optional */ }

  const { battery, app_version, device_info } = body as {
    battery?: number;
    app_version?: string;
    device_info?: Record<string, unknown>;
  };

  const { error } = await supabase.from('driver_heartbeats').upsert(
    {
      driver_id: driver.id,
      last_heartbeat_at: new Date().toISOString(),
      battery_pct: battery ?? null,
      app_version: app_version ?? null,
      device_info: device_info ?? null,
    },
    { onConflict: 'driver_id' },
  );

  if (error) return respondError('Failed to update heartbeat', 500, error);

  return Response.json({ ok: true }, { headers: corsHeaders });
});
