import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { driver_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { driver_id } = body;
  if (!driver_id) {
    return new Response(JSON.stringify({ error: 'driver_id is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const callerId = userData.user.id;
  const isDriver = callerId === driver_id;

  if (!isDriver) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const diditApiKey = Deno.env.get('DIDIT_API_KEY')!;

  const diditRes = await fetch('https://api.didit.me/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${diditApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callback_url: `${supabaseUrl}/functions/v1/kyc-didit-webhook`,
      redirect_url: 'remisapp://kyc-complete',
    }),
  });

  if (!diditRes.ok) {
    const errText = await diditRes.text();
    console.error('Didit API error:', diditRes.status, errText);
    return new Response(JSON.stringify({ error: 'KYC provider error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const diditResponse: { session_id: string; session_url: string } = await diditRes.json();

  const { error: insertError } = await supabase.from('kyc_verifications').insert({
    driver_id,
    provider: 'didit',
    status: 'pending',
    metadata: { session_id: diditResponse.session_id },
  });

  if (insertError) {
    console.error('Insert kyc_verifications error:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to persist KYC session' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      session_url: diditResponse.session_url,
      session_id: diditResponse.session_id,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    },
  );
});
