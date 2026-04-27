import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { respondError } from '../_shared/errors.ts';
import { createServiceRoleClient } from '../_shared/supabase.ts';
import { getTemplate, type NotificationType } from '../_shared/notification_templates.ts';
import { sendFcmMessage } from '../_shared/fcm.ts';
import { log } from '../_shared/logger.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respondError('Invalid JSON', 400);
  }

  const { recipient_user_id, type, ride_id, metadata } = body as {
    recipient_user_id?: string;
    type?: string;
    ride_id?: string;
    metadata?: Record<string, string>;
  };

  if (!recipient_user_id || !type) {
    return respondError('recipient_user_id and type are required', 400);
  }

  const supabase = createServiceRoleClient();

  // Idempotencia: evitar duplicar notificaciones para el mismo (recipient, type, ride_id)
  if (ride_id) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', recipient_user_id)
      .eq('type', type)
      .contains('data', { ride_id })
      .maybeSingle();

    if (existing) {
      log('info', 'Duplicate notification skipped', { recipient_user_id, type, ride_id });
      return Response.json({ ok: true, skipped: true }, { headers: corsHeaders });
    }
  }

  const template = getTemplate(type as NotificationType);
  const { data: tokens, error: tokenErr } = await supabase
    .from('fcm_tokens')
    .select('id, token, platform')
    .eq('user_id', recipient_user_id);

  if (tokenErr) return respondError('Failed to fetch tokens', 500, tokenErr);
  if (!tokens || tokens.length === 0) {
    log('warn', 'No FCM tokens for user', { recipient_user_id });
    return Response.json({ ok: true, sent: 0 }, { headers: corsHeaders });
  }

  const data: Record<string, string> = {
    type,
    click_action: 'OPEN_RIDE',
    ...(ride_id ? { ride_id } : {}),
    ...(metadata ?? {}),
  };

  let sent = 0;
  const staleTokenIds: string[] = [];

  for (const { id: tokenId, token } of tokens) {
    try {
      const { messageId, error } = await sendFcmMessage({
        token,
        title: template.title,
        body: template.body,
        data,
        androidChannel: template.androidChannel,
        iosSound: template.iosSound,
      });

      if (error === 'UNREGISTERED') {
        staleTokenIds.push(tokenId);
      } else if (messageId) {
        sent++;
        await supabase.from('notifications').insert({
          recipient_id: recipient_user_id,
          type,
          title: template.title,
          body: template.body,
          fcm_message_id: messageId,
          data,
          sent_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      log('error', 'FCM send exception', { token: '[REDACTED]', err: String(err) });
    }
  }

  if (staleTokenIds.length > 0) {
    await supabase.from('fcm_tokens').delete().in('id', staleTokenIds);
    log('info', 'Removed stale FCM tokens', { count: staleTokenIds.length });
  }

  return Response.json({ ok: true, sent }, { headers: corsHeaders });
});
