import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  RekognitionClient,
  CompareFacesCommand,
} from 'npm:@aws-sdk/client-rekognition';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

  let body: { driver_id?: string; current_selfie_path?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { driver_id, current_selfie_path } = body;

  if (!driver_id || !current_selfie_path) {
    return new Response(JSON.stringify({ error: 'driver_id and current_selfie_path are required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Intra-shift face checks must be the driver themselves — no admin proxy allowed.
  if (userData.user.id !== driver_id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { data: kycRecord, error: kycError } = await supabase
    .from('kyc_verifications')
    .select('reference_face_url')
    .eq('driver_id', driver_id)
    .eq('status', 'approved')
    .order('verified_at', { ascending: false })
    .limit(1)
    .single();

  if (kycError || !kycRecord?.reference_face_url) {
    return new Response(JSON.stringify({ error: 'No approved KYC record found for driver' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { data: referenceData, error: refDownloadError } = await supabase.storage
    .from('kyc-private')
    .download(kycRecord.reference_face_url);

  if (refDownloadError || !referenceData) {
    console.error('Failed to download reference face:', refDownloadError);
    return new Response(JSON.stringify({ error: 'Failed to retrieve reference image' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { data: currentData, error: currentDownloadError } = await supabase.storage
    .from('kyc-temp')
    .download(current_selfie_path);

  if (currentDownloadError || !currentData) {
    console.error('Failed to download current selfie:', currentDownloadError);
    return new Response(JSON.stringify({ error: 'Failed to retrieve current selfie' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const referenceBytes = new Uint8Array(await referenceData.arrayBuffer());
  const currentBytes = new Uint8Array(await currentData.arrayBuffer());

  const region = Deno.env.get('AWS_REGION') ?? 'us-east-1';

  const rekognition = new RekognitionClient({
    region,
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    },
  });

  let similarity = 0;

  try {
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: referenceBytes },
      TargetImage: { Bytes: currentBytes },
      SimilarityThreshold: 80,
    });

    const result = await rekognition.send(command);
    similarity = result.FaceMatches?.[0]?.Similarity ?? 0;
  } catch (err) {
    console.error('Rekognition error:', err);
    await supabase.storage.from('kyc-temp').remove([current_selfie_path]);
    return new Response(JSON.stringify({ error: 'Face comparison service error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const passed = similarity >= 90;

  await supabase.from('kyc_verifications').insert({
    driver_id,
    provider: 'aws_rekognition',
    status: passed ? 'approved' : 'rejected',
    score: similarity / 100,
    metadata: { source: 'intra_shift', similarity },
  });

  // Always clean up the temp image regardless of outcome.
  await supabase.storage.from('kyc-temp').remove([current_selfie_path]);

  if (!passed) {
    await supabase
      .from('drivers')
      .update({ is_online: false, current_status: 'suspended' })
      .eq('id', driver_id);

    await supabase.from('security_events').insert({
      user_id: driver_id,
      event_type: 'kyc_intra_shift_failed',
      severity: 'critical',
      metadata: { similarity },
    });
  }

  return new Response(JSON.stringify({ passed, similarity }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
