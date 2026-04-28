import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWIML_EMPTY = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

const TWIML_HEADERS = {
  'Content-Type': 'application/xml',
};

async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  let s = url;
  for (const key of sortedKeys) {
    s += key + params[key];
  }

  const enc = new TextEncoder();
  const keyData = enc.encode(authToken);
  const msgData = enc.encode(s);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(body)) {
    params[key] = value;
  }
  return params;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(TWIML_EMPTY, { status: 200, headers: TWIML_HEADERS });
  }

  const rawBody = await req.text();
  const params = parseFormBody(rawBody);

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const webhookUrl = `${supabaseUrl}/functions/v1/twilio-incoming-webhook`;

  const twilioSignature = req.headers.get('X-Twilio-Signature');
  if (!twilioSignature) {
    return new Response('Forbidden', { status: 403 });
  }

  const expectedSignature = await computeTwilioSignature(authToken, webhookUrl, params);

  let sigMismatch = twilioSignature.length !== expectedSignature.length;
  for (let i = 0; i < Math.max(twilioSignature.length, expectedSignature.length); i++) {
    if ((twilioSignature.charCodeAt(i) || 0) !== (expectedSignature.charCodeAt(i) || 0)) sigMismatch = true;
  }
  if (sigMismatch) {
    return new Response('Forbidden', { status: 403 });
  }

  const callSid: string | undefined = params['CallSid'];
  const callStatus: string | undefined = params['CallStatus'];
  const proxySessionSid: string | undefined = params['ProxySessionSid'];
  const callDurationRaw: string | undefined = params['CallDuration'];

  if (!callSid || !callStatus) {
    return new Response(TWIML_EMPTY, { status: 200, headers: TWIML_HEADERS });
  }

  const supabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const durationSeconds = callDurationRaw ? parseInt(callDurationRaw, 10) : null;

  const upsertPayload: Record<string, unknown> = {
    twilio_call_sid: callSid,
    status: callStatus,
  };

  if (proxySessionSid) upsertPayload['proxy_session_sid'] = proxySessionSid;
  if (durationSeconds !== null && !isNaN(durationSeconds)) {
    upsertPayload['duration_seconds'] = durationSeconds;
  }

  const { error: upsertError } = await supabase
    .from('phone_calls')
    .upsert(upsertPayload, { onConflict: 'twilio_call_sid' });

  if (upsertError) {
    console.error('phone_calls upsert error:', upsertError);
  }

  return new Response(TWIML_EMPTY, { status: 200, headers: TWIML_HEADERS });
});
