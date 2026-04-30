# Prompt 08 — Centro SOS: mapa real + acciones de operación

## Objetivo

`/admin/sos` lista emergencias pero el "mapa de emergencias" es un placeholder textual (`<p>Hacé clic en una emergencia activa…</p>`). El detail (`/admin/sos/[id]`) tampoco trackea quién atendió ni cuándo. Y la acción "Notificar contactos externos" no existe pese a tener la columna `external_contacts_notified`.

Este prompt deja el centro SOS operativo.

**Tiempo estimado:** 1.5 horas.

## Contexto del proyecto

Mismo que prompts anteriores. Tabla `sos_events` con columnas: `triggered_by`, `triggered_role`, `location` (PostGIS), `prior_locations` (jsonb), `dispatched_to_dispatcher`, `external_contacts_notified` (jsonb), `resolved_at`, `resolved_by`, `resolution_notes`. Mapa con MapLibre GL JS.

**Pendiente del schema (validar):** quizás falten columnas `dispatched_at` y `dispatched_by`. Si no existen, crear migration.

## Tareas concretas

### 1. (Conditional) Agregar columnas dispatched_at / dispatched_by

Si las columnas no existen, agregar via MCP `apply_migration`:

```sql
ALTER TABLE public.sos_events
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES public.profiles(id);
```

Regenerar tipos con MCP `generate_typescript_types` y guardar en `packages/shared-types/database.ts`.

### 2. Mapa con todos los SOS activos

`apps/dispatcher/src/components/admin/sos/sos-list-client.tsx:400-411`

Reemplazar el placeholder textual por un MapLibre map (dynamic import, igual que `/admin/zones` o ride detail).

Funcionalidad:
- Centro: La Pampa (lat -36.62, lng -64.29) con zoom 11.
- Marcadores rojos pulsantes para cada SOS activo (status `dispatched_to_dispatcher = true AND resolved_at IS NULL`).
- Marcadores grises para SOS resueltos en las últimas 24h.
- Click en marker → highlight de la fila correspondiente en la lista + popup con info clave (rol, hora, link "Abrir detalle").
- Realtime subscribe: cuando llega un nuevo SOS event, agregar marcador automáticamente y centrar el mapa.

Imports y patrón: copiar el setup de `apps/dispatcher/src/app/dispatch/map-fullscreen/map-fullscreen-client.tsx` o de zones-client.

### 3. Notificar contactos externos

`apps/dispatcher/src/components/admin/sos/sos-detail-client.tsx`

En la card del detail SOS, agregar sección "Contactos externos":

Si `external_contacts_notified` está vacío:
- Botón "Notificar contactos de emergencia"
- Click → dialog con:
  - Lista de contactos definidos en `org_settings.alert_emails` o `notification_contacts` (si la columna no existe, usá un mock por ahora con admins/dispatchers).
  - Checkbox por contacto: email, SMS (Twilio), Telegram (bot del dueño).
  - Textarea para mensaje opcional.
  - Submit → llama edge function `notify-sos-contacts` (crearla en este prompt).

Si ya hay registros en `external_contacts_notified`, mostrar timeline: "Notificaste a Juan a las 14:30 vía email" / "Notificaste al bot de Telegram a las 14:31".

#### Edge function `notify-sos-contacts`

`supabase/functions/notify-sos-contacts/index.ts`:

- Recibe `{ sos_id, channels: { email: string[], sms: string[], telegram: boolean }, message: string }`.
- Valida que el caller es admin/dispatcher.
- Para email: usa el resend / sendgrid / smtp config existente. Si no hay todavía, dejar comentario `// TODO: integrar provider de email` y solo loggear.
- Para SMS: usa Twilio (creds en secrets `TWILIO_*`). Si no están, dejar comentario.
- Para Telegram: usa `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID_OWNER` (ya están en `launch_checklist`).
- Update `sos_events.external_contacts_notified` con un append jsonb de cada notificación enviada (timestamp, channel, recipient).

**Si no hay creds de email/sms** para el demo: la función puede solo loggear y registrar en jsonb. El cliente ve "Notificación enviada" y la entrada queda en el log; en producción real se conecta con provider.

### 4. Marcar como atendiendo (track dispatched_at / dispatched_by)

`apps/dispatcher/src/components/admin/sos/sos-detail-client.tsx:442`

Hoy "Marcar como atendiendo" flippea `dispatched_to_dispatcher = true` sin más.

Cambiar a:

```ts
await sb.from('sos_events').update({
  dispatched_to_dispatcher: true,
  dispatched_at: new Date().toISOString(),
  dispatched_by: user.id,
}).eq('id', sos.id);
```

En la UI del detail, mostrar después: "Atendido por {dispatcher_name} a las {time}".

### 5. Resolver SOS con notas

Cuando hace click en "Resolver":

- Dialog con:
  - Textarea "Notas de resolución" (obligatoria, mín 10 chars).
  - Select "Resultado" (resolved / false_alarm / escalated_to_911 / other).
- Submit:

```ts
await sb.from('sos_events').update({
  resolved_at: new Date().toISOString(),
  resolved_by: user.id,
  resolution_notes: notes,
}).eq('id', sos.id);
```

Si el resultado es `escalated_to_911`, no resolver — abre instructivo: "Llamá al 911 desde tu teléfono (no se puede llamar automáticamente)" y mantenerlo abierto. (Esto reemplaza el `tel:911` que en desktop no funciona.)

### 6. Fix `tel:911` en desktop

`sos-detail-client.tsx:643`

Hoy: `onClick={() => window.open('tel:911')}`.

Mejor:
- Mobile: dejar `<a href="tel:911">Llamar al 911</a>` (el sistema operativo maneja el handler nativo).
- Desktop: cambiar a un dialog que muestre el número grande "911" con icono de copy + texto "Llamá desde tu teléfono. Aún no podemos hacer la llamada por vos."

Detectar mobile via `navigator.userAgent` o un breakpoint CSS-only:

```tsx
<a href="tel:911" className="block md:hidden">Llamar al 911</a>
<button onClick={openCallDialog} className="hidden md:block">Cómo llamar al 911</button>
```

### 7. Filtros en historial SOS

`/admin/sos` lista no tiene filtro por "Resueltos / activos".

Agregar tabs o un toggle:
- Activos (default): `dispatched_to_dispatcher = true AND resolved_at IS NULL`
- Resueltos: `resolved_at IS NOT NULL`
- Todos

Y mantener el filtro por rol que ya existe.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. `/admin/sos` → ver mapa con SOS activos pulsantes (los del seed).
2. Click en un marker → highlight de la fila + popup con info.
3. Provocar un SOS nuevo (vía MCP execute_sql `INSERT INTO sos_events ...`) → aparece en realtime sin reload.
4. Filtros activos / resueltos / todos funcionan.
5. Click en un SOS → detail.
6. Click "Marcar como atendiendo" → muestra "Atendido por X a las HH:MM".
7. Click "Notificar contactos" → dialog → enviar → registro queda en `external_contacts_notified`.
8. Click "Resolver" → dialog → notas obligatorias → submit → SOS marcado resuelto.
9. Click "Llamar al 911" en mobile → abre dialer del SO.
10. Click "Llamar al 911" en desktop → abre dialog con instrucciones.

## Commit

```
feat(sos): mapa con activos en realtime + acciones de operación

- (DB) Migración: dispatched_at, dispatched_by en sos_events
- /admin/sos: mapa MapLibre con marcadores rojos pulsantes para activos,
  grises para resueltos 24h. Realtime subscribe.
- Click en marker abre popup + highlight de fila correspondiente.
- /admin/sos/[id]: marcar como atendiendo trackea dispatched_at/by
- Notificar contactos externos: dialog + edge function notify-sos-contacts
  con email + Telegram (placeholders donde no hay provider)
- Resolver: dialog con notas obligatorias + clasificación
- Fix tel:911 en desktop (dialog con instrucciones)
- Filtros activos/resueltos/todos en historial
```
