import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const RATE_LIMIT_CONFIGS = {
  'mp-create-preference': { max_tokens: 10, refill_rate_per_minute: 10 },
  'kyc-compare-face': { max_tokens: 20, refill_rate_per_minute: 0.333 },
  'twilio-create-proxy-session': { max_tokens: 100, refill_rate_per_minute: 3.33 },
  'register-fcm-token': { max_tokens: 5, refill_rate_per_minute: 0.083 },
} as const;

interface RateLimitRequest {
  key: string;
  max_tokens: number;
  refill_rate_per_minute: number;
  cost: number;
}

interface RateLimitAllowed {
  allowed: true;
  remaining: number;
}

interface RateLimitDenied {
  allowed: false;
  remaining: 0;
  retry_after_seconds: number;
}

type RateLimitResult = RateLimitAllowed | RateLimitDenied;

interface BucketRow {
  tokens: number;
  last_refill: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secret = req.headers.get('X-Rate-Limit-Secret');
  const expectedSecret = Deno.env.get('RATE_LIMIT_SECRET');
  if (!secret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: RateLimitRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { key, max_tokens, refill_rate_per_minute, cost } = body;

  if (!key || max_tokens == null || refill_rate_per_minute == null || cost == null) {
    return new Response(JSON.stringify({ error: 'key, max_tokens, refill_rate_per_minute, and cost are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limit_buckets')
      .select('tokens, last_refill')
      .eq('key', key)
      .maybeSingle<BucketRow>();

    if (fetchError) {
      throw fetchError;
    }

    if (!existing) {
      const remaining = max_tokens - cost;

      // Not perfectly atomic — a concurrent insert could race here.
      // Acceptable at this scale (~50 drivers); worst case is a double-spend
      // of one token on the very first request for a given key.
      await supabase.from('rate_limit_buckets').insert({
        key,
        tokens: remaining,
        last_refill: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result: RateLimitAllowed = { allowed: true, remaining };
      return buildResponse(result, remaining);
    }

    const now = Date.now();
    const lastRefill = new Date(existing.last_refill).getTime();
    const elapsedMinutes = (now - lastRefill) / 60_000;

    const refilled = Math.min(
      Number(existing.tokens) + elapsedMinutes * refill_rate_per_minute,
      max_tokens,
    );

    if (refilled >= cost) {
      const remaining = refilled - cost;

      // Same race-condition caveat as above — two concurrent requests can
      // both read the same token count and both succeed, effectively spending
      // tokens twice. Acceptable given the small fleet size.
      await supabase
        .from('rate_limit_buckets')
        .update({
          tokens: remaining,
          last_refill: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('key', key);

      const result: RateLimitAllowed = { allowed: true, remaining };
      return buildResponse(result, remaining);
    }

    const deficit = cost - refilled;
    const retry_after_seconds = Math.ceil((deficit / refill_rate_per_minute) * 60);
    const result: RateLimitDenied = { allowed: false, remaining: 0, retry_after_seconds };
    return buildResponse(result, 0, retry_after_seconds);
  } catch (_err) {
    // DB failure → fail open: better to let a legitimate request through
    // than to block all traffic during an outage.
    const failOpen: RateLimitAllowed = { allowed: true, remaining: -1 };
    return buildResponse(failOpen, -1);
  }
});

function buildResponse(result: RateLimitResult, remaining: number, retryAfter?: number): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': String(Math.max(0, Math.floor(remaining))),
  };

  if (retryAfter !== undefined) {
    headers['Retry-After'] = String(retryAfter);
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers,
  });
}
