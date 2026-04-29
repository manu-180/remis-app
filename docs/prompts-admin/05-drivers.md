# Sesión 05 — Conductores: lista, perfil tabbed, alta y edición

> **Sesiones previas**: 00 → 04.

---

## Objetivo

Construir el **CRUD completo de conductores** con experiencia premium: lista filtrable / paginada con DataTable, perfil tabbed con métricas + documentos + KYC + ubicación, y un wizard premium para alta de conductor. Esta es probablemente la página más usada después del dashboard — tiene que ser **impecable**.

---

## Contexto Supabase

Tablas:
- `profiles` (id, full_name, phone, email, avatar_url, role, deleted_at)
- `drivers` (id → profiles.id, is_active, is_online, current_status, vehicle_id, rating, total_rides, joined_at)
- `vehicles` (id, plate, make, model, color, year, vehicle_type, mobile_number, is_active)
- `driver_documents` (driver_id, document_type, file_url, issued_at, expires_at, verified, verified_by, verified_at)
  - `document_type` enum: `luc_d1`, `vtv`, `insurance_rc`, `insurance_passengers`, `health_card`, `vehicle_authorization`, `criminal_record`
- `kyc_verifications` (driver_id, provider, status, score, metadata, verified_at)
- `driver_current_location` (driver_id, location, heading, speed_mps, battery_pct, status, updated_at)
- `driver_location_history` (particionada por mes; usar para últimas 24h ride)
- `rides` (driver_id) → para histórico y métricas
- `ride_ratings` (driver_id) → rating histórico

Storage: las fotos de perfil van a Supabase Storage bucket `avatars` y los docs a `driver-documents`. **Verificá que esos buckets existan** vía `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__execute_sql`:

```sql
SELECT id, name, public FROM storage.buckets;
```

Si no existen, crearlos vía migration:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('driver-documents', 'driver-documents', false);
```

Y políticas RLS apropiadas (avatars públicos para leer, docs solo para staff).

---

## Entregables

### Parte A — Lista `/admin/drivers`

Reescribir `apps/dispatcher/src/app/(admin)/admin/drivers/page.tsx`.

Layout:
- `PageHeader`: title "Conductores" + description + acciones a la derecha (`<Button>Nuevo conductor</Button>` que abre Drawer de alta).
- KPI strip arriba (4 mini stats):
  - Total
  - Online ahora
  - En viaje
  - Suspendidos
- `FilterBar` con filters:
  - Search (nombre, teléfono, patente)
  - Estado (multiselect: available, en_route_to_pickup, on_trip, on_break, offline, suspended)
  - Activos / inactivos / suspendidos / todos (chips toggle)
- `DataTable` columnas:
  - **Conductor**: avatar + nombre + teléfono debajo en gris pequeño
  - **Estado**: `StatusPill` (driver) con pulse si online
  - **Vehículo**: patente bold + "Toyota Etios" gris
  - **Rating**: estrella + número (4.8) tabular
  - **Viajes**: total tabular
  - **Última actividad**: relative time
  - **Acciones**: kebab menu con "Ver", "Editar", "Suspender", "Eliminar"
- Click row → navega a `/admin/drivers/[id]`.
- Pagination 25 por página.

Realtime: suscribirse a `drivers` y `driver_current_location` para actualizar status pills sin reload.

### Parte B — Perfil `/admin/drivers/[id]`

Crear `apps/dispatcher/src/app/(admin)/admin/drivers/[id]/page.tsx`.

#### Header
- Avatar grande 96px con ring 4px (color depende del status)
- Nombre + teléfono + email
- StatusPill grande
- Stats inline: "X viajes · ⭐ 4.8 · alta hace 2 meses"
- Acciones a la derecha: `<Button variant="ghost">Editar</Button>` y dropdown "Más acciones" (suspender, reactivar, resetear rating, eliminar)
- Layout: Card glass con `gradient-glow` sutil arriba

#### Tabs
1. **Resumen** (default)
   - 4 Stat cards: viajes este mes, ingresos generados (estimados), rating promedio (mes), tasa de aceptación
   - Gráfico de viajes últimos 30 días (sparkline barras)
   - Última actividad: feed pequeño (asignaciones, completados, etc. de `ride_events`)

2. **Vehículo**
   - Card con patente grande, marca/modelo, color, año, tipo de vehículo
   - Botón "Cambiar vehículo" → Combobox con vehículos disponibles + opción "Nuevo vehículo" → Drawer de alta de vehículo
   - Lista de vehículos históricos asignados

3. **Documentos**
   - Grid 3 columnas con cada `document_type`:
     - LUC D1, VTV, Seguro RC, Seguro pasajeros, Carnet sanitario, Autorización vehicular, Antecedentes
   - Cada card: título, estado (verificado/pendiente/vencido), fecha emisión / vencimiento, botón "Subir" o "Ver"
   - Si vencido: card con left border rojo + badge danger
   - Si por vencer (<30 días): badge warning
   - Click "Subir" → Drawer con upload a Storage bucket `driver-documents`, fields: archivo (drop zone), issued_at, expires_at. Al guardar inserta en `driver_documents`.
   - Botón "Verificar" (solo admin) marca verified=true.

4. **KYC**
   - Lista de `kyc_verifications` del driver
   - Mostrar provider (didit / aws_rekognition), score, status, metadata JSON formateado
   - Botón "Iniciar verificación" → invoca edge function `kyc-create-session` y muestra link/QR
   - Si último resultado fue rechazado, banner rojo en header del perfil

5. **Histórico de viajes**
   - Mini DataTable de `rides` con `driver_id = id`. Columnas: fecha, pasajero, origen, destino, estado, tarifa.
   - Filter por rango de fechas y estado.
   - Click row → navega a `/admin/rides/[id]`.

6. **Ubicación actual**
   - MapLibre fullscreen del card con marker animado del driver (lee `driver_current_location` y suscribe a updates).
   - Trail de últimas N posiciones (de `driver_location_history` mes en curso, últimas 50).
   - Velocidad, heading, batería abajo en stats.
   - Si offline > 5 min, marker en gris.

### Parte C — Drawer de alta `/admin/drivers/new` (o trigger desde la lista)

Crear `apps/dispatcher/src/components/admin/drivers/driver-form-drawer.tsx`.

Wizard de 4 pasos con stepper visible arriba:

#### Paso 1: Datos personales
- `full_name`, `phone` (formato AR `+54 9 ...`), `email` (opcional), foto avatar (upload a Storage `avatars`)
- Validación zod (phone con regex, email opcional pero formato válido si presente)

#### Paso 2: Vehículo
- Combobox "Asignar vehículo existente" → lista de `vehicles where is_active = true and id NOT IN (assigned)` o "Crear nuevo"
- Si "Crear nuevo": fields plate (uppercase auto), make, model, color, year, vehicle_type select

#### Paso 3: Documentos iniciales
- Lista de los 7 document_types con upload por cada uno (opcional — pueden subir después)
- Calendar pickers para issued_at / expires_at

#### Paso 4: Confirmación
- Resumen card con todo lo cargado
- Switch "Activar inmediatamente" (default true)
- Botón "Crear conductor" grande con loading state

#### Lógica de creación

**Importante**: crear el conductor requiere crear primero el `auth.user` (no podemos hacerlo desde el client con anon key). Opciones:

**Opción A (recomendada)**: usar Supabase Admin API via edge function nueva. Crear migration que despliega edge function `admin-create-driver` que:
1. Recibe payload `{ full_name, phone, email, vehicle_id, ... }`
2. Verifica que el caller es admin (JWT)
3. Llama a `supabase.auth.admin.createUser({ email, phone, password: random_temp })`
4. Inserta `profile`, `driver`, vincula vehicle
5. Devuelve el `driver_id`

> Si crear edge function complica esta sesión, hacerlo vía RPC `admin_create_driver` con `SECURITY DEFINER` y `pg_net` para llamar al admin endpoint. Pero `pg_net` requiere la `service_role` key en una variable de DB. La forma más limpia es la edge function. **Hacer la edge function**.

Aplicar via `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__deploy_edge_function`. Documentar en `supabase/functions/admin-create-driver/index.ts` y `supabase/functions/admin-create-driver/README.md`.

Después del onSubmit exitoso:
- Toast: "Conductor creado · ver perfil" (con action button)
- Cerrar drawer
- Refrescar lista
- Auto-enviar email de bienvenida con magic link (`auth.admin.generateLink`) → opcional, mencionar como TODO si no entra

### Parte D — Edición

Reusar `DriverFormDrawer` con prop `initialData`. En modo edición, no se puede cambiar email (el cambio de auth requiere flujo separado). Mostrar warning si intenta.

### Parte E — Acciones admin

Endpoints en cliente que llaman queries directas (RLS de admin permite write):

- **Suspender**: `update drivers set current_status='suspended', is_active=false where id=:id`
- **Reactivar**: `update drivers set current_status='offline', is_active=true where id=:id`
- **Reset rating**: `update drivers set rating=5.00, total_rides=0 where id=:id` con confirmación danger
- **Eliminar (soft)**: `update profiles set deleted_at=now() where id=:id` con confirmación danger

Todas via `useConfirm` y toasts con undo cuando posible.

---

## Detalles premium imprescindibles

- **Avatar ring color** según status: verde (online), naranja (busy), gris (offline), rojo (suspended).
- **Tabs**: subrayado animado al cambiar, no solo color.
- **Documentos card**: hover → lift + show "Click para gestionar" overlay glass.
- **Mapa del perfil**: marker custom (icono auto + ring pulsante con accent dorado).
- **Stepper del wizard**: línea con dot por paso, dot completado se llena de brand-accent con check icon, dot actual con ring.
- **Upload de avatar**: preview circular en vivo + drag-drop con dashed border que se vuelve sólido al hover.
- **Rating estrellas**: 5 estrellas con fill proporcional (4.8 → 4 llenas + 80% de la quinta), iconos `Star` lucide con `fill="var(--brand-accent)"`.
- **Submit en wizard**: botón disabled si paso inválido, con tooltip explicando por qué.
- **Validación inline**: mensaje de error con `AlertCircle` icon en rojo, fade-up al aparecer.
- **Empty histórico**: empty state con ilustración "Aún no realizó viajes" y botón "Ver dashboard".

---

## Validación

1. `pnpm typecheck`, `pnpm lint`.
2. Lista `/admin/drivers`: KPI bar correcto, filtros funcionan, pagination, click row → perfil.
3. Crear un conductor nuevo via wizard: aparece en lista, perfil accesible, vehículo vinculado.
4. Subir un documento: aparece en tab Documentos, file en bucket Storage.
5. Iniciar KYC (puede mockear el resultado del provider en dev).
6. Ver mapa de ubicación con marker (si el driver tiene GPS history; sino mostrar empty state).
7. Suspender / reactivar / eliminar funcionan con confirmación.

---

## No hacer

- ❌ Implementar el flow real del provider KYC (didit) — solo trigger de la edge function existente
- ❌ Construir el editor de tarifas / zonas (sesión 09)
- ❌ Hacer notificaciones push del invite — TODO documentado
- ❌ Tocar el dispatcher live

---

## Commit final

```bash
git add .
git commit -m "feat(admin): drivers CRUD with profile tabs, wizard create flow and storage uploads"
git push
```
