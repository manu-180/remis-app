import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_ROLES = ['admin', 'dispatcher'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

interface InviteBody {
  email: string
  role: AllowedRole
  full_name: string
}

type ValidationResult =
  | { ok: true; data: InviteBody }
  | { ok: false; error: string }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validateBody(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid-body' }
  const obj = raw as Record<string, unknown>

  const email =
    typeof obj.email === 'string' ? obj.email.trim().toLowerCase() : ''
  const role = obj.role
  const full_name =
    typeof obj.full_name === 'string' ? obj.full_name.trim() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid-email' }
  }
  if (
    typeof role !== 'string' ||
    !(ALLOWED_ROLES as readonly string[]).includes(role)
  ) {
    return { ok: false, error: 'invalid-role' }
  }
  if (full_name.length < 2 || full_name.length > 100) {
    return { ok: false, error: 'invalid-name' }
  }

  return {
    ok: true,
    data: { email, role: role as AllowedRole, full_name },
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

    // 1. Caller debe ser admin autenticado.
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
      .select('role')
      .eq('id', user.id)
      .single()
    if (callerErr || !callerProfile) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    if (callerProfile.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    // 2. Validar body.
    const raw = await req.json().catch(() => null)
    const validation = validateBody(raw)
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, 400)
    }
    const { email, role, full_name } = validation.data

    // 3. Enviar invite. La URL de redirect es donde aterriza el usuario tras
    //    confirmar desde el email; debe ser un host de la app, no de Supabase.
    const appUrl =
      Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3001'
    const redirectTo = `${appUrl.replace(/\/$/, '')}/accept-invite`

    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name, role },
      })

    if (inviteErr) {
      const msg = inviteErr.message?.toLowerCase() ?? ''
      // Idempotencia: si el usuario ya existe, devolvemos 409 para que el
      // cliente pueda diferenciar "ya está invitado" vs error real.
      if (
        msg.includes('already') ||
        msg.includes('registered') ||
        msg.includes('exists')
      ) {
        return jsonResponse(
          { error: 'already-registered', message: inviteErr.message },
          409,
        )
      }
      console.error('[admin-invite-staff] inviteUserByEmail failed:', inviteErr)
      return jsonResponse(
        { error: 'invite-failed', message: inviteErr.message },
        500,
      )
    }

    const newUserId = invited.user?.id
    if (!newUserId) {
      return jsonResponse({ error: 'invite-no-user' }, 500)
    }

    // 4. Setear rol y nombre en profiles. El trigger handle_new_user crea el
    //    profile con role default; lo sobreescribimos. Si falla logueamos pero
    //    no fallamos: la invitación ya salió y el rol se puede arreglar a mano.
    const { error: roleErr } = await supabaseAdmin
      .from('profiles')
      .update({ role, full_name, email })
      .eq('id', newUserId)
    if (roleErr) {
      console.error('[admin-invite-staff] profile update failed:', roleErr)
    }

    // 5. Audit entry. profiles no tiene trigger de auditoría, así que lo
    //    insertamos explícito. El trigger audit_log_hash_chain llena
    //    prev_hash/row_hash automáticamente.
    const { error: auditErr } = await supabaseAdmin.from('audit_log').insert({
      entity: 'profiles',
      entity_id: newUserId,
      action: 'invite_staff',
      actor_id: user.id,
      actor_role: 'admin',
      diff: {
        invited_email: email,
        invited_role: role,
        invited_name: full_name,
      },
    })
    if (auditErr) {
      console.error('[admin-invite-staff] audit_log insert failed:', auditErr)
    }

    return jsonResponse({ ok: true, user_id: newUserId }, 200)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[admin-invite-staff] unexpected error:', msg)
    return jsonResponse({ error: 'internal', message: msg }, 500)
  }
})
