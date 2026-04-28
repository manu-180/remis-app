import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { respondError } from '../_shared/errors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase.ts';

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

  const { token, platform, device_id, app_version } = body as {
    token?: string;
    platform?: string;
    device_id?: string;
    app_version?: string;
  };

  if (!token || !platform) return respondError('token and platform are required', 400);
  if (!['android', 'ios', 'web'].includes(platform)) return respondError('Invalid platform', 400);

  const supabase = createServiceRoleClient();

  // Eliminar tokens viejos del mismo device_id con token distinto
  if (device_id) {
    await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', device_id)
      .neq('token', token);
  }

  const { error } = await supabase.from('fcm_tokens').upsert(
    { user_id: user.id, token, platform, device_id: device_id ?? null, app_version: app_version ?? null, last_seen_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  );

  if (error) return respondError('Failed to register token', 500, error);

  return Response.json({ ok: true }, { headers: corsHeaders });
});
