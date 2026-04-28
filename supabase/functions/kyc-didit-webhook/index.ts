import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DiditStatus = 'APPROVED' | 'REJECTED' | 'REVIEW_NEEDED' | string;
type DbKycStatus = 'approved' | 'rejected' | 'pending' | 'expired';

interface DiditWebhookBody {
  session_id: string;
  status: DiditStatus;
  driver_id: string;
  score: number;
  document_type: string;
  document_number: string;
  face_image_url: string;
}

function mapStatus(diditStatus: DiditStatus): DbKycStatus {
  switch (diditStatus) {
    case 'APPROVED': return 'approved';
    case 'REJECTED': return 'rejected';
    default: return 'pending';
  }
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Timing-safe comparison to prevent timing attacks on signature verification.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();
  const receivedSig = req.headers.get('X-Didit-Signature') ?? '';

  const webhookSecret = Deno.env.get('DIDIT_WEBHOOK_SECRET')!;
  const expectedSig = await hmacSha256Hex(webhookSecret, rawBody);

  if (!timingSafeEqual(receivedSig, expectedSig)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: DiditWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    session_id,
    status: diditStatus,
    driver_id,
    score,
    document_type,
    document_number,
    face_image_url,
  } = body;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const dbStatus = mapStatus(diditStatus);
  const documentNumberHash = await sha256Hex(document_number);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from('kyc_verifications')
    .select('id, metadata')
    .filter('metadata->>session_id', 'eq', session_id)
    .single();

  if (fetchError || !existing) {
    console.error('KYC record not found for session_id:', session_id, fetchError);
    // Acknowledge receipt to prevent Didit from retrying indefinitely.
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mergedMetadata = {
    ...(existing.metadata ?? {}),
    didit_status: diditStatus,
    reviewed_at: now,
    ...(diditStatus === 'REVIEW_NEEDED' ? { needs_manual_review: true } : {}),
  };

  const { error: updateError } = await supabase
    .from('kyc_verifications')
    .update({
      status: dbStatus,
      score: score / 100,
      verified_at: now,
      document_type,
      document_number_hash: documentNumberHash,
      expires_at: expiresAt,
      reference_face_url: face_image_url,
      metadata: mergedMetadata,
    })
    .eq('id', existing.id);

  if (updateError) {
    console.error('Failed to update kyc_verifications:', updateError);
    // Return 200 so Didit does not retry — log for manual recovery.
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (diditStatus === 'APPROVED') {
    const { error: activateError } = await supabase
      .from('drivers')
      .update({ is_active: true })
      .eq('id', driver_id);
    if (activateError) console.error('Failed to activate driver:', driver_id, activateError);
  }

  if (diditStatus === 'REJECTED') {
    const { error: eventError } = await supabase.from('security_events').insert({
      user_id: driver_id,
      event_type: 'kyc_onboarding_rejected',
      severity: 'warning',
      metadata: { session_id, score },
    });
    if (eventError) console.error('Failed to insert security_event for KYC rejection:', eventError);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
