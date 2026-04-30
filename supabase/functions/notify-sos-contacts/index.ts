// notify-sos-contacts
// ---------------------------------------------------------------------------
// Notifica a contactos externos (admins/dispatchers) sobre un SOS activo.
// Canales: email, sms (Twilio), telegram (bot del owner).
//
// Si no hay creds configuradas para email/sms, registra la notificación en
// `sos_events.external_contacts_notified` con status `pending_provider` para
// que quede el log auditado y la UI lo muestre.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Channels = {
  email?: string[]
  sms?: string[]
  telegram?: boolean
}

type RequestBody = {
  sos_id: string
  channels: Channels
  message?: string
}

type NotificationLogEntry = {
  timestamp: string
  channel: 'email' | 'sms' | 'telegram'
  recipient: string
  status: 'sent' | 'pending_provider' | 'failed'
  message?: string
  error?: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function validateBody(raw: unknown): { ok: true; data: RequestBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid-body' }
  const obj = raw as Record<string, unknown>

  const sos_id = typeof obj.sos_id === 'string' ? obj.sos_id : ''
  if (!isUuid(sos_id)) return { ok: false, error: 'invalid-sos-id' }

  const channelsRaw = obj.channels as Record<string, unknown> | undefined
  if (!channelsRaw || typeof channelsRaw !== 'object') {
    return { ok: false, error: 'invalid-channels' }
  }

  const emails = Array.isArray(channelsRaw.email)
    ? (channelsRaw.email as unknown[])
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    : []

  const sms = Array.isArray(channelsRaw.sms)
    ? (channelsRaw.sms as unknown[])
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length >= 6)
    : []

  const telegram = channelsRaw.telegram === true

  if (emails.length === 0 && sms.length === 0 && !telegram) {
    return { ok: false, error: 'no-channels' }
  }

  const message = typeof obj.message === 'string' ? obj.message.trim().slice(0, 500) : undefined

  return {
    ok: true,
    data: {
      sos_id,
      channels: { email: emails, sms, telegram },
      message,
    },
  }
}

async function sendTelegram(
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID_OWNER')
  if (!token || !chatId) {
    return { ok: false, error: 'telegram-not-configured' }
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { ok: false, error: `telegram-${res.status}: ${txt.slice(0, 100)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method-not-allowed' }, 405)
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 1. Auth: caller debe ser admin o dispatcher.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return jsonResponse({ error: 'unauthorized' }, 401)

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return jsonResponse({ error: 'unauthorized' }, 401)

    const { data: callerProfile, error: callerErr } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    if (callerErr || !callerProfile) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    if (!['admin', 'dispatcher'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    // 2. Validar body.
    const raw = await req.json().catch(() => null)
    const validation = validateBody(raw)
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, 400)
    }
    const { sos_id, channels, message } = validation.data

    // 3. Cargar el SOS para construir el mensaje y validar que existe.
    const { data: sos, error: sosErr } = await supabaseAdmin
      .from('sos_events')
      .select(
        'id, triggered_role, location, created_at, ride_id, external_contacts_notified, profiles:triggered_by (full_name, phone)',
      )
      .eq('id', sos_id)
      .single()
    if (sosErr || !sos) {
      return jsonResponse({ error: 'sos-not-found' }, 404)
    }

    // 4. Construir mensaje base.
    // deno-lint-ignore no-explicit-any
    const triggeredBy = (sos as any).profiles?.full_name ?? 'desconocido'
    // deno-lint-ignore no-explicit-any
    const triggeredPhone = (sos as any).profiles?.phone ?? '—'
    // deno-lint-ignore no-explicit-any
    const loc = (sos as any).location?.coordinates as [number, number] | undefined
    const locStr = loc ? `${loc[1].toFixed(5)}, ${loc[0].toFixed(5)}` : 'sin ubicación'
    const mapsLink = loc ? `https://www.google.com/maps?q=${loc[1]},${loc[0]}` : null

    const baseText = [
      `🚨 <b>SOS activo</b> (${sos.triggered_role})`,
      `Disparado por: ${triggeredBy} (${triggeredPhone})`,
      `Hora: ${new Date(sos.created_at as string).toLocaleString('es-AR')}`,
      `Ubicación: ${locStr}`,
      mapsLink ? `Mapa: ${mapsLink}` : null,
      message ? `\nMensaje: ${message}` : null,
      `\nNotificado por: ${callerProfile.full_name ?? user.email ?? 'staff'}`,
    ]
      .filter(Boolean)
      .join('\n')

    // 5. Enviar / loggear por canal.
    const log: NotificationLogEntry[] = []
    let sentCount = 0
    let pendingCount = 0

    // 5a. Telegram
    if (channels.telegram) {
      const result = await sendTelegram(baseText)
      log.push({
        timestamp: new Date().toISOString(),
        channel: 'telegram',
        recipient: 'bot-owner',
        status: result.ok ? 'sent' : result.error === 'telegram-not-configured' ? 'pending_provider' : 'failed',
        message: message ?? undefined,
        error: result.ok ? undefined : result.error,
      })
      if (result.ok) sentCount++
      else if (result.error === 'telegram-not-configured') pendingCount++
    }

    // 5b. Email — provider no integrado todavía.
    // Si en el futuro se agregan creds (RESEND_API_KEY / SENDGRID_API_KEY),
    // implementar el envío real aquí.
    for (const email of channels.email ?? []) {
      log.push({
        timestamp: new Date().toISOString(),
        channel: 'email',
        recipient: email,
        status: 'pending_provider',
        message: message ?? undefined,
      })
      pendingCount++
    }

    // 5c. SMS via Twilio (si hay creds).
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')
    for (const phone of channels.sms ?? []) {
      if (!twilioSid || !twilioToken || !twilioFrom) {
        log.push({
          timestamp: new Date().toISOString(),
          channel: 'sms',
          recipient: phone,
          status: 'pending_provider',
          message: message ?? undefined,
        })
        pendingCount++
        continue
      }
      try {
        const body = new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: baseText.replace(/<\/?b>/g, ''),
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          },
        )
        if (res.ok) {
          log.push({
            timestamp: new Date().toISOString(),
            channel: 'sms',
            recipient: phone,
            status: 'sent',
            message: message ?? undefined,
          })
          sentCount++
        } else {
          const txt = await res.text().catch(() => '')
          log.push({
            timestamp: new Date().toISOString(),
            channel: 'sms',
            recipient: phone,
            status: 'failed',
            error: `twilio-${res.status}: ${txt.slice(0, 100)}`,
            message: message ?? undefined,
          })
        }
      } catch (e) {
        log.push({
          timestamp: new Date().toISOString(),
          channel: 'sms',
          recipient: phone,
          status: 'failed',
          error: e instanceof Error ? e.message : String(e),
          message: message ?? undefined,
        })
      }
    }

    // 6. Append al jsonb de external_contacts_notified.
    const existing = Array.isArray(sos.external_contacts_notified)
      ? (sos.external_contacts_notified as NotificationLogEntry[])
      : []
    const merged = [...existing, ...log]

    const { error: updateErr } = await supabaseAdmin
      .from('sos_events')
      .update({ external_contacts_notified: merged })
      .eq('id', sos_id)
    if (updateErr) {
      console.error('[notify-sos-contacts] update sos_events failed:', updateErr)
      return jsonResponse(
        { error: 'persist-failed', message: updateErr.message, log },
        500,
      )
    }

    // 7. Audit log
    const { error: auditErr } = await supabaseAdmin.from('audit_log').insert({
      entity: 'sos_events',
      entity_id: sos_id,
      action: 'notify_contacts',
      actor_id: user.id,
      actor_role: callerProfile.role,
      diff: {
        channels: {
          email: channels.email ?? [],
          sms: channels.sms ?? [],
          telegram: channels.telegram ?? false,
        },
        message,
        sent: sentCount,
        pending: pendingCount,
      },
    })
    if (auditErr) {
      console.error('[notify-sos-contacts] audit_log insert failed:', auditErr)
    }

    return jsonResponse(
      {
        ok: true,
        sent: sentCount,
        pending: pendingCount,
        log,
      },
      200,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[notify-sos-contacts] unexpected error:', msg)
    return jsonResponse({ error: 'internal', message: msg }, 500)
  }
})
