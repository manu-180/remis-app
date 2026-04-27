import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceRoleClient } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createServiceRoleClient();
  let dbStatus = 'ok';

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) dbStatus = 'error';
  } catch {
    dbStatus = 'error';
  }

  // Verificar que el Service Account JSON está presente (no llamamos FCM real)
  const fcmConfigured = !!Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';

  return Response.json(
    {
      status,
      checks: {
        db: dbStatus,
        fcm: fcmConfigured ? 'ok' : 'not_configured',
      },
      version: 'tanda-3',
      timestamp: new Date().toISOString(),
    },
    {
      status: status === 'ok' ? 200 : 503,
      headers: corsHeaders,
    },
  );
});
