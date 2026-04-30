# Prompt 04 — Invitación de staff por email real

## Objetivo

Hoy `/admin/team` tiene un drawer "Invitar miembro" que muestra instrucciones manuales (en prompt 00 lo dejamos pulido pero todavía sin invite real). Este prompt agrega **el flujo end-to-end**: edge function `admin-invite-staff` que llama a `supabase.auth.admin.inviteUserByEmail` y le asigna el rol elegido.

**Tiempo estimado:** 2 horas.

## Contexto del proyecto

Mismo que prompts anteriores. **MCP de Supabase disponible** (`mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__*`). Project ID: `kmdnsxbpzidpkinlablf`. Edge functions ya existentes: `kyc-create-session`, `driver-heartbeat`, `admin-create-driver`, `mp-webhook`, `cron-alerts-monitor`.

**Reglas:** main directo, push tras commitear, no branches/worktrees.

## Tareas concretas

### 1. Crear la edge function `admin-invite-staff`

Archivos:
- `supabase/functions/admin-invite-staff/index.ts`
- `supabase/functions/admin-invite-staff/deno.json` (si el proyecto usa configs por función)

Plantilla en TS para Deno (Supabase Edge Runtime):

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const Body = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'dispatcher']),
  full_name: z.string().min(2).max(100),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);

  // 1. Verificar que el caller es admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403);

  // 2. Validar body
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: 'bad-request', details: parsed.error.flatten() }, 400);
  const { email, role, full_name } = parsed.data;

  // 3. Crear cliente admin con service_role
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 4. Invite con redirect al admin
  const redirect = `${Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3001'}/auth/accept-invite`;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirect,
    data: { full_name, role },
  });
  if (inviteErr) {
    return json({ error: 'invite-failed', message: inviteErr.message }, 500);
  }

  // 5. Update profile.role (el trigger crea el profile con default; lo sobreescribimos)
  if (invited.user) {
    const { error: roleErr } = await admin
      .from('profiles')
      .update({ role, full_name })
      .eq('id', invited.user.id);
    if (roleErr) {
      // logueamos pero no fallamos: el usuario fue creado
      console.error('[admin-invite-staff] role update failed:', roleErr);
    }
  }

  return json({ ok: true, user_id: invited.user?.id }, 200);
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
```

### 2. Deployar la edge function

Vía MCP:

```
mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__deploy_edge_function(
  project_id: "kmdnsxbpzidpkinlablf",
  name: "admin-invite-staff",
  files: [...]
)
```

Configurar en Supabase (vía MCP `apply_migration` o el dashboard):
- `SUPABASE_SERVICE_ROLE_KEY` (debe estar ya como secret).
- `NEXT_PUBLIC_APP_URL` con el origen del admin (en local `http://localhost:3001`, en producción el dominio real).

Verificar el deploy con `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__list_edge_functions(project_id: "kmdnsxbpzidpkinlablf")`.

### 3. Conectar el form en `/admin/team`

`apps/dispatcher/src/components/admin/team/team-client.tsx`:

Reemplazar el contenido del drawer "Invitar miembro" (que en prompt 00 quedó como instrucción manual) por un form real:

- Inputs: `full_name`, `email`, `role` (Select: dispatcher / admin).
- Validación con Zod + react-hook-form (siguiendo patrón del proyecto).
- Submit:

```ts
const { data: { session } } = await sb.auth.getSession();
if (!session) { toast.error('Sesión expirada'); return; }
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-invite-staff`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(values),
});
if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  toast.error(body.message ?? 'No pudimos enviar la invitación');
  return;
}
toast.success(`Invitamos a ${values.email} con rol ${values.role}`);
refetch();
closeDrawer();
```

### 4. Página `/auth/accept-invite`

Crear `apps/dispatcher/src/app/(auth)/accept-invite/page.tsx`:

- Server component que recibe el `token_hash` por query.
- Llama `supabase.auth.verifyOtp({ token_hash, type: 'invite' })`.
- Si OK, redirige a un client component con form para setear contraseña.
- Si falla, muestra mensaje "El link de invitación expiró o ya fue usado".

Después del set-password con `supabase.auth.updateUser({ password })`, redirigí al admin con toast.

### 5. Mostrar lista de invites pendientes (opcional, nice-to-have)

Si los `auth.users` con `email_confirmed_at = null` representan invites pendientes, mostrarlos en la lista de team con badge "Pendiente". Permitir reenviar el invite (mismo endpoint, idempotente: tirar nuevo `inviteUserByEmail`).

### 6. Audit log entry

Cuando se invita un staff, agregar entrada al `audit_log`. Esto puede ser implícito por el trigger del schema (revisar) o explícito desde la edge function:

```ts
await admin.from('audit_log').insert({
  entity: 'profiles',
  entity_id: invited.user.id,
  action: 'invite_staff',
  actor_id: user.id,
  actor_role: 'admin',
  diff: { invited_email: email, invited_role: role },
});
```

Si los hashes de la cadena se calculan por trigger, no necesitás el `prev_hash` / `row_hash` manualmente.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. Logueate como admin (`manu@gmail.com`).
2. `/admin/team` → "Invitar miembro" → form con name + email + role.
3. Submit con email real (uno tuyo) → toast éxito.
4. Recibir el email en el inbox del email invitado.
5. Click en el link → caer en `/auth/accept-invite?token_hash=...` → form de password.
6. Setear contraseña → redirige a `/login` o `/admin` según el flow.
7. Loguearse con el nuevo email → debe ir a `/admin` (si rol admin) o `/` (si rol dispatcher).
8. `/admin/audit` → debe aparecer entrada `invite_staff` con el actor correcto.
9. Volver al admin original → la lista en `/admin/team` debe mostrar el nuevo miembro.

## Commit

```
feat(admin): invite real de staff por email

- supabase/functions/admin-invite-staff: edge function con auth check
  + role validation + auth.admin.inviteUserByEmail + role assign
- /admin/team drawer ahora envía invite real con name/email/role
- /auth/accept-invite: página que verifica token y setea password
- audit_log entry por cada invite
- (Opcional) Badge "Pendiente" para invites no confirmados
```
