# Sesión 10 — Pasajeros, pagos, KYC review y feature flags

> **Sesiones previas**: 00 → 09.

---

## Objetivo

Cubrir las **operaciones secundarias** del admin: gestión de pasajeros (lista + perfil + blacklist), centro de pagos (cash vs MercadoPago, conciliación, reembolsos), cola de revisión KYC, panel de feature flags con audit, y vista de audit log con hash chain.

Esta sesión combina varias páginas porque cada una es relativamente más simple (no requiere mapas, wizards, ni timelines). Total: 5 páginas.

---

## Contexto Supabase

Tablas:
- `passengers` (id → profiles.id, default_payment_method, blacklisted, blacklist_reason, total_rides, total_no_shows, notes)
- `payments` (id, ride_id, method, amount_ars, status, mp_payment_id, mp_preference_id, paid_at)
- `mp_webhook_events` (id, x_request_id, data_id, action, raw_body, signature_valid, processed_status, error_message, received_at)
- `kyc_verifications` (driver_id, provider, status, score, metadata, verified_at)
- `feature_flags` (key, enabled, description, updated_at)
- `audit_log` (entity, entity_id, action, actor_id, actor_role, diff, prev_hash, row_hash, created_at)

---

## Entregables

### Parte A — `/admin/passengers`

Reescribir `apps/dispatcher/src/app/(admin)/admin/passengers/page.tsx`.

Layout:
- KPI strip:
  - Total pasajeros
  - Activos (>0 viajes último mes)
  - Blacklisted
  - Promedio no-shows
- `FilterBar`: search (nombre, teléfono), filter blacklisted yes/no, sort by total_rides / no_shows
- `DataTable`:
  - Pasajero (avatar + nombre + tel)
  - Total viajes
  - No-shows (badge warning si > 0)
  - Método pago default (icon)
  - Estado (Activo / Blacklisted con badge danger)
  - Última actividad
  - Acciones: Ver, Blacklist toggle (con confirm), Eliminar
- Click row → drawer detalle (en vez de página dedicada para no inflar):

#### Drawer detalle pasajero

- Header con avatar + nombre + tel + email
- 4 stats inline: total viajes, no-shows, gasto total acumulado, miembro desde
- Toggle Blacklist con campo `blacklist_reason` (textarea requerido si activa)
- Notas (textarea editable, save inline)
- Histórico breve: últimos 10 viajes en mini DataTable (link al detalle)
- Sección "Direcciones frecuentes" leyendo `frequent_addresses` (lista, label + texto + use_count)

### Parte B — `/admin/payments`

Reescribir `apps/dispatcher/src/app/(admin)/admin/payments/page.tsx`.

Layout:
- KPI strip:
  - Cobrado hoy (sum approved)
  - Pendiente (sum pending)
  - Reembolsado (sum refunded mes)
  - % MP vs Cash (gauge mini)
- 2 Tabs: **Pagos** | **Webhooks MP**

#### Tab Pagos

- `FilterBar`: search por mp_payment_id / ride_id, método (multiselect), status (multiselect), rango fecha
- `DataTable`:
  - Fecha
  - Ride (short ID + link)
  - Método (icon + label)
  - Monto (tabular ARS)
  - Estado (StatusPill)
  - MP ID (truncado + copy button)
  - Acciones: Ver detalle (drawer), Reembolsar (si approved + admin)

#### Drawer detalle pago

- Card con todos los campos
- Status timeline de payment (`pending` → `approved` con timestamp)
- JSON formateado del raw response MP (si aplica)
- Botón "Reembolsar" → confirma → para esta sesión: solo update local `status='refunded'` (no llamar a MP API real). TODO documentar en comments.

#### Tab Webhooks MP

- `DataTable` de `mp_webhook_events`:
  - received_at
  - data_id (mp_payment_id)
  - action (icon)
  - signature_valid (check verde / x rojo)
  - processed_status (pill)
  - Acciones: Ver raw_body (modal con JSON viewer)

### Parte C — `/admin/kyc`

Reescribir `apps/dispatcher/src/app/(admin)/admin/kyc/page.tsx`.

Layout:
- Tabs: **Pendientes** | **Aprobados** | **Rechazados** | **Vencidos**
- En "Pendientes": Lista (no DataTable, son cards más visuales) — cada pendiente:
  - Card grande con avatar driver
  - Provider badge (didit / aws_rekognition)
  - Score como progress bar (0-1)
  - Metadata key fields (ID number, dob, etc.)
  - Botones grandes: "Aprobar" (verde) / "Rechazar" (rojo, requiere razón)
  - Side-by-side: foto del driver vs foto del documento (placeholder si no hay)
  - Click "Ver más" → expande con metadata JSON formateado
- En otras tabs: DataTable simple con driver, provider, status, score, fecha

#### Aprobar / Rechazar

- Llama edge function `kyc-create-session` (revisar el endpoint actual)... esperá: el endpoint actual crea **sesiones**, no las **resuelve**. Para aprobación manual, crear nueva edge function `kyc-resolve` o RPC `admin_resolve_kyc(verification_id, decision, notes)` con `is_admin()` check.

Crear vía MCP `apply_migration`:

```sql
CREATE OR REPLACE FUNCTION public.admin_resolve_kyc(
  p_verification_id uuid,
  p_decision kyc_status,
  p_notes text DEFAULT NULL
) RETURNS kyc_verifications
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record kyc_verifications;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE kyc_verifications
  SET status = p_decision,
      verified_at = CASE WHEN p_decision IN ('approved','rejected','expired') THEN now() ELSE verified_at END,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('admin_notes', p_notes, 'resolved_by', auth.uid())
  WHERE id = p_verification_id
  RETURNING * INTO v_record;

  -- Audit
  INSERT INTO audit_log (entity, entity_id, action, actor_id, actor_role, diff)
  VALUES ('kyc_verifications', p_verification_id::text, 'resolve', auth.uid(), 'admin',
          jsonb_build_object('decision', p_decision, 'notes', p_notes));

  RETURN v_record;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_kyc(uuid, kyc_status, text) TO authenticated;
```

### Parte D — `/admin/feature-flags`

Reescribir `apps/dispatcher/src/app/(admin)/admin/feature-flags/page.tsx`.

Layout:
- Lista de cards, cada flag:
  - Switch grande
  - Key (monospace)
  - Description (texto editable inline al doble-click)
  - Last updated relative
  - Botón "Ver historial" → drawer con audit_log filtrado por entity='feature_flags', entity_id=key
- Cambiar switch → UPDATE en feature_flags + insert audit_log (lo hace el trigger, verificar)

### Parte E — `/admin/audit`

Reescribir `apps/dispatcher/src/app/(admin)/admin/audit/page.tsx`.

Layout:
- KPI strip:
  - Eventos hoy
  - Eventos por tipo top-3
- `FilterBar`: search entity_id, multiselect entity, multiselect action, multiselect actor_role, rango fecha
- `DataTable` (default 100/página):
  - Timestamp
  - Entity + entity_id (link al recurso)
  - Action (badge)
  - Actor (avatar + nombre + role pill)
  - Hash chain integrity indicator (icon check verde si ok, warning si broken)
- Click row → drawer con diff JSON formateado (left side prev / right side next o solo el diff)

#### Hash chain verification

Mostrar arriba un banner si la cadena tiene un break. Ejecutar function `audit_log_hash_chain()` (existe) y mostrar count de mismatches. Si > 0: banner rojo "Cadena de auditoría comprometida — contactar a desarrollador".

### Parte F — `/admin/team`

Reescribir `apps/dispatcher/src/app/(admin)/admin/team/page.tsx`.

Layout:
- Lista en cards de profiles con role IN ('dispatcher', 'admin') + deleted_at IS NULL
- Cada card: avatar, nombre, email, role pill, último login (si está disponible — `auth.users.last_sign_in_at` accesible vía RPC porque RLS de auth.users es restrictiva). Crear RPC:

```sql
CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE (id uuid, full_name text, email text, role user_role, avatar_url text, last_sign_in_at timestamptz)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT p.id, p.full_name, p.email, p.role, p.avatar_url, u.last_sign_in_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role IN ('dispatcher', 'admin')
    AND p.deleted_at IS NULL
  ORDER BY p.full_name
$$;

GRANT EXECUTE ON FUNCTION public.list_staff() TO authenticated;
-- Si querés strict: REVOKE FROM PUBLIC y solo grant a admins, pero hacerlo via RLS con check de is_admin() dentro de la función.
```

Modificar la función para que rechace si no es admin:

```sql
-- Inside function:
IF NOT is_admin() THEN
  RAISE EXCEPTION 'Forbidden';
END IF;
```

- Acciones por usuario: Cambiar rol (dispatcher ↔ admin), eliminar (soft, set deleted_at)
- Botón arriba: "Invitar nuevo miembro" → drawer con email + role select. Crea via edge function `admin-invite-staff` (similar a admin-create-driver de sesión 05).
- Si la edge function se vuelve mucho, dejar como "TODO: implementar invite" y mostrar instrucciones manuales (crear usuario en auth + UPDATE profiles SET role).

### Parte G — `/admin/settings`

Reescribir `apps/dispatcher/src/app/(admin)/admin/settings/page.tsx`.

Tabs:
- **Organización**: nombre comercial (placeholder, no hay tabla todavía), logo upload, timezone
- **Notificaciones**: emails para alertas SOS, webhook URL para integraciones
- **Integraciones**: keys de servicios (mostrar masked, edit con confirm)
- **Cuenta**: cambiar password, 2FA toggle (placeholder)

> Esta página puede ser superficial. La idea es dejar el scaffold listo. Si no hay tabla `org_settings`, crearla via migration:

```sql
CREATE TABLE IF NOT EXISTS public.org_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true), -- singleton
  brand_name text DEFAULT 'RemisDespacho',
  logo_url text,
  timezone text DEFAULT 'America/Argentina/Buenos_Aires',
  alert_emails text[] DEFAULT '{}',
  webhook_url text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_settings_select_authenticated ON public.org_settings FOR SELECT USING (true);
CREATE POLICY org_settings_write_admin ON public.org_settings FOR ALL USING (is_admin());

INSERT INTO public.org_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
```

---

## Detalles premium imprescindibles

- **Pasajeros blacklist toggle**: animación de Off→On con shake del card y left border rojo apareciendo.
- **Pagos KPI MP vs Cash**: gauge SVG con 2 colores (brand vs accent), porcentaje grande tabular.
- **KYC**: comparación side-by-side de fotos con zoom on hover (CSS `transform: scale(1.5)` desde origen del cursor).
- **Feature flag history drawer**: timeline minimalista con dot por cada cambio.
- **Audit hash chain**: visualización de cadena (mini iconos `Link` entre eventos), color rojo si broken.
- **Team avatars**: grid responsivo con cards que tienen hover lift, role pill con tinte específico (brand para admin, neutral para dispatcher).
- **Settings tabs**: layout cómodo, no apretar; cada tab respira.

---

## Validación

1. Pasajeros: lista, drawer, blacklist toggle, notas guarda.
2. Payments: tab pagos OK, tab webhooks OK, reembolso simulado.
3. KYC: aprobar / rechazar genera audit_log entry, status cambia.
4. Feature flags: toggle persiste, history drawer carga.
5. Audit: filtros funcionan, hash chain banner OK.
6. Team: lista correcta, cambio de rol funciona.
7. Settings: cargar, guardar campo, persistir.

---

## No hacer

- ❌ Implementar reembolso real con MP API
- ❌ 2FA real
- ❌ Webhook outbound real
- ❌ Logo upload UI compleja (file input simple a Storage)

---

## Commit final

```bash
git add .
git commit -m "feat(admin): passengers, payments, KYC review, feature flags, audit, team and settings"
git push
```
