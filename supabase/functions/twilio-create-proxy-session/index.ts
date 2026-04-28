import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RideRow {
  id: string;
  passenger_id: string;
  driver_id: string;
  passenger_phone: string;
  passenger_name: string;
  driver_phone: string | null;
  mobile_number: string | null;
}

interface TwilioParticipant {
  sid: string;
  friendly_name: string;
  identifier: string;
  proxy_identifier: string;
}

interface TwilioParticipantListResponse {
  participants: TwilioParticipant[];
}

interface TwilioSessionResponse {
  sid: string;
}

function twilioBasicAuth(accountSid: string, authToken: string): string {
  return 'Basic ' + btoa(`${accountSid}:${authToken}`);
}

async function twilioPost(
  url: string,
  params: Record<string, string>,
  accountSid: string,
  authToken: string,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': twilioBasicAuth(accountSid, authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
}

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

  const { data: callerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !callerProfile) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!['dispatcher', 'admin'].includes(callerProfile.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { ride_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { ride_id } = body;
  if (!ride_id) {
    return new Response(JSON.stringify({ error: 'ride_id is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { data: rideData, error: rideError } = await supabase
    .from('rides')
    .select(`
      id,
      passenger_id,
      driver_id,
      passengers!rides_passenger_id_fkey ( phone_number, full_name ),
      drivers!rides_driver_id_fkey ( mobile_number ),
      profiles!rides_driver_id_fkey ( phone )
    `)
    .eq('id', ride_id)
    .in('status', ['assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip'])
    .single();

  if (rideError || !rideData) {
    return new Response(JSON.stringify({ error: 'Ride not found or invalid status' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const ride = rideData as unknown as {
    id: string;
    passenger_id: string;
    driver_id: string;
    passengers: { phone_number: string; full_name: string } | null;
    drivers: { mobile_number: string | null } | null;
    profiles: { phone: string | null } | null;
  };

  const passengerPhone = ride.passengers?.phone_number;
  const passengerName = ride.passengers?.full_name ?? 'Pasajero';
  const driverPhone = ride.profiles?.phone ?? ride.drivers?.mobile_number;

  if (!passengerPhone || !driverPhone) {
    return new Response(JSON.stringify({ error: 'Missing phone numbers for ride participants' }), {
      status: 422,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const e164Re = /^\+?[1-9]\d{7,14}$/;
  if (!e164Re.test(passengerPhone) || !e164Re.test(driverPhone)) {
    return new Response(JSON.stringify({ error: 'Invalid phone number format for ride participants' }), {
      status: 422,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const proxySid = Deno.env.get('TWILIO_PROXY_SERVICE_SID')!;

  const sessionRes = await twilioPost(
    `https://proxy.twilio.com/v1/Services/${proxySid}/Sessions`,
    {
      UniqueName: `ride_${ride_id}`,
      Ttl: '14400',
      Mode: 'voice-only',
    },
    accountSid,
    authToken,
  );

  if (!sessionRes.ok) {
    const errText = await sessionRes.text();
    console.error('Twilio create session error:', sessionRes.status, errText);
    // 409 means a session with this UniqueName already exists — treat as conflict.
    const status = sessionRes.status === 409 ? 409 : 502;
    const message = status === 409 ? 'Proxy session already exists for this ride' : 'Failed to create proxy session';
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const session: TwilioSessionResponse = await sessionRes.json();
  const sessionSid = session.sid;

  const participantBase = `https://proxy.twilio.com/v1/Services/${proxySid}/Sessions/${sessionSid}/Participants`;

  const passengerRes = await twilioPost(
    participantBase,
    { Identifier: passengerPhone, FriendlyName: passengerName },
    accountSid,
    authToken,
  );

  if (!passengerRes.ok) {
    const errText = await passengerRes.text();
    console.error('Twilio add passenger error:', passengerRes.status, errText);
    return new Response(JSON.stringify({ error: 'Failed to add passenger to proxy session' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const driverRes = await twilioPost(
    participantBase,
    { Identifier: driverPhone, FriendlyName: 'Conductor' },
    accountSid,
    authToken,
  );

  if (!driverRes.ok) {
    const errText = await driverRes.text();
    console.error('Twilio add driver error:', driverRes.status, errText);
    return new Response(JSON.stringify({ error: 'Failed to add driver to proxy session' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const listRes = await fetch(participantBase, {
    headers: { 'Authorization': twilioBasicAuth(accountSid, authToken) },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error('Twilio list participants error:', listRes.status, errText);
    return new Response(JSON.stringify({ error: 'Failed to fetch proxy numbers' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const participantList: TwilioParticipantListResponse = await listRes.json();
  const participants = participantList.participants;

  const passengerParticipant = participants.find((p) => p.identifier === passengerPhone);
  const driverParticipant = participants.find((p) => p.identifier === driverPhone);

  if (!passengerParticipant || !driverParticipant) {
    return new Response(JSON.stringify({ error: 'Could not resolve proxy numbers for participants' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      passenger_proxy: passengerParticipant.proxy_identifier,
      driver_proxy: driverParticipant.proxy_identifier,
      session_sid: sessionSid,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    },
  );
});
