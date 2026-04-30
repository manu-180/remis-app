# Prompt 00 — Purgar placeholders visibles al cliente

## Objetivo

Eliminar todos los placeholders, TODOs, `alert()` nativos, links muertos y mensajes "próximamente" que están actualmente expuestos al usuario en el admin web. Esto es lo más visible y mata la demo en los primeros 5 minutos.

**Tiempo estimado:** 1.5 horas.

## Contexto del proyecto

Trabajás en `C:/MisProyectos/clientes/remis_app/` (Windows). Stack: Next.js 15 + React 19 + Tailwind v4 + Supabase SSR + Zustand. Path del admin: `apps/dispatcher/src/app/(admin)/admin/`.

**Reglas no negociables del proyecto:**
- Trabajar en `main` directo. **NO crear branches ni worktrees.** Push después de commitear.
- NO sugerir alternativas a Supabase, Next.js, Tailwind v4.
- Para queries Supabase, seguí el patrón existente con `(supabase.rpc as any)` y `(supabase.from(...) as any)` cuando los tipos den problemas.
- Tipos Supabase en `packages/shared-types/database.ts`. Está regenerado y al día.
- Stack: ver `apps/dispatcher/CLAUDE.md` y `docs/prompts-admin/README.md`.

**Antes de empezar:** abrí `apps/dispatcher/CLAUDE.md` y `docs/prompts-admin-prod/README.md` para refrescar reglas y schema.

## Tareas concretas

### 1. Login — link "¿Olvidaste tu contraseña?" (CRÍTICO, primera pantalla visible)

`apps/dispatcher/src/app/(auth)/login/page.tsx:106-109`

Hoy: `<Link href="#">¿Olvidaste tu contraseña?</Link>` no hace nada.

Hacelo funcional con Supabase: cuando el usuario haga click, abrir un dialog donde ingrese el email y llamar a `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${origin}/auth/reset-password' })`. Mostrar toast con "Te enviamos un email con instrucciones" o el error que devuelva.

Crear la página `apps/dispatcher/src/app/(auth)/reset-password/page.tsx` que reciba el `code` por query, llame a `supabase.auth.exchangeCodeForSession(code)` y muestre un form para nueva contraseña con `supabase.auth.updateUser({ password })`. Redirige a `/login` con toast de éxito.

### 2. Settings — `alert()` nativo en cambio de contraseña (CRÍTICO)

`apps/dispatcher/src/components/admin/settings/settings-client.tsx:311-315`

Hoy: `handleChangePassword` ejecuta `alert('Funcionalidad en desarrollo')`.

Reemplazar por implementación real: validar password actual con `supabase.auth.signInWithPassword({ email: user.email, password: current })`, si OK hacer `supabase.auth.updateUser({ password: nueva })`. Mostrar éxito/error con `toast` (sonner ya está integrado).

Form fields: contraseña actual, nueva, confirmar nueva. Validar con Zod (mín 8 caracteres, ambas nuevas iguales). Form usa react-hook-form siguiendo patrón del resto.

### 3. Settings — toggle de 2FA visible pero falso

`apps/dispatcher/src/components/admin/settings/settings-client.tsx:309, 366-376`

Hoy: el `Switch` de 2FA cambia su estado local pero no persiste nada. El texto "La configuración de 2FA estará disponible próximamente" está debajo.

Por ahora: **deshabilitar el Switch** con `disabled={true}` y agregarle un badge "Próximamente" usando el componente `<Badge variant="muted">Pronto</Badge>` del design-system. Limpiar el state `twoFaEnabled` que queda muerto. (En el prompt 05 implementamos 2FA real, pero para este prompt el objetivo es solo no mentir).

### 4. Settings — tab "Integraciones" con placeholder feo

`apps/dispatcher/src/components/admin/settings/settings-client.tsx` y `IntegrationsTab` (línea ~280-300)

Hoy: muestra cards con valores `••••••••` y footer "este panel es solo de referencia".

**Eliminar la tab entera.** Sacarla del array de tabs y borrar el componente `IntegrationsTab`. Las claves se manejan por `.env`, no tiene sentido renderizar máscaras.

### 5. Team — drawer con TODO crudo (CRÍTICO — más roto del admin)

`apps/dispatcher/src/components/admin/team/team-client.tsx:357-373`

Hoy: el drawer "Invitar miembro" muestra literal `<strong>TODO:</strong> La invitación por email requiere implementar la edge function admin-invite-staff` y el botón final dice `Cerrar (TODO: implementar invite)`.

Por ahora (la implementación real va en prompt 04): **reemplazar el contenido del drawer por un mensaje pulido**:

```
"Las invitaciones por email se incorporarán en la próxima versión. 
Mientras tanto, para agregar un miembro:
1. Crealo en Supabase Dashboard → Authentication → Users → Invite user
2. Después asignale el rol con: 
   UPDATE profiles SET role = 'dispatcher' WHERE email = 'nuevo@email.com'"
```

Incluir un botón secundario "Copiar SQL" que copie el statement con el email del input al portapapeles. Mantener el form (email + select rol) como input, validar email con Zod. Mantener el botón cerrar.

### 6. Dashboard — filtros de período "Pronto disponible"

`apps/dispatcher/src/components/admin/dashboard/dashboard-client.tsx:48-52`

Hoy: el `Select` ofrece "Hoy", "Últimos 7 días", "Mes en curso", "Últimos 30 días". Solo "Hoy" funciona; el resto tira `toast.info('Pronto disponible')`.

Por ahora: **dejar solo "Hoy" en el Select** (eliminar las demás opciones). En el prompt 06 los reactivamos con queries reales. Esto evita que el cliente se cruce con el toast en su primera pantalla.

### 7. Dashboard — refresh artificial con setTimeout

`apps/dispatcher/src/components/admin/dashboard/dashboard-client.tsx:57-62`

Hoy: el botón refresh hace `setTimeout(800)` artificial.

Cambiar por: setear `isRefreshing(true)`, llamar `kpisRefetch()`, en el `.then(() => setIsRefreshing(false))`. El `Stat loading` ya muestra el shimmer. Si no se nota, agregar también `await Promise.all` con los otros refetchs (sparklines, top drivers, activity).

### 8. Sidebar — "Despacho live" redirige circularmente

`apps/dispatcher/src/components/admin/sidebar.tsx`

Hoy: el item "Despacho live" lleva a `/`, y `apps/dispatcher/src/app/(dashboard)/page.tsx:7` redirige a `/admin`. Si un admin clickea, queda donde estaba.

Decidir uno:
- **Opción A (recomendada)**: ocultar el item del sidebar cuando `role === 'admin'`. Solo dispatchers ven "Despacho live".
- **Opción B**: cambiar el `href` a `/dispatch` y mantener el redirect del `/` para landing-only.

Implementar A. Si el `role` no está disponible en el sidebar, traerlo del context o pasarlo como prop desde `app-shell.tsx`.

### 9. KYC — botón "Iniciar verificación" con toast

`apps/dispatcher/src/components/admin/drivers/tabs/tab-kyc.tsx:115`

Hoy: `onClick={() => toast.info('Funcionalidad en desarrollo')}`.

KYC se inicia desde la app driver (no desde el admin). **Quitar el botón**. Si la columna `kyc_verifications` para ese driver está vacía, mostrar empty-state: "Este conductor aún no completó su verificación KYC desde la app." con un secondary text "El proceso lo inicia el conductor desde su dispositivo".

### 10. Drivers detail — viajes no clickeables

`apps/dispatcher/src/components/admin/drivers/tabs/tab-viajes.tsx:132`

Hoy: `onRowClick={() => toast.info('Detalle de viaje — próximamente')}`.

Cambiar a navegación real: `onRowClick={(row) => router.push(\`/admin/rides/${row.id}\`)}`. El cursor debe quedar `cursor: pointer` en hover. Las rutas existen.

### 11. Rides list — botón "Exportar CSV" miente

`apps/dispatcher/src/components/admin/rides/rides-list-client.tsx:354`

Hoy: `onClick={() => toast.info('Exportación iniciada — el archivo se descargará en breve.')}` y nunca se descarga nada.

Por ahora: **ocultar el botón Export**. Lo implementamos real en el prompt 03. El placeholder mentiroso es peor que la ausencia.

### 12. Otros toasts "próximamente" / placeholders varios

Buscá globalmente y limpiá lo que quede:

```bash
# Desde apps/dispatcher/
rg "próximamente|coming soon|funcionalidad en desarrollo|TODO:|FIXME|placeholder" src/
```

Para cada hit que sea visible al usuario:
- Si es un toast `.info('próximamente')` en una acción de UI: ocultá el botón/elemento que lo dispara.
- Si es un texto en JSX: reemplazalo por copy real o eliminá la sección.
- Si es un comentario `// TODO` en código (no visible): déjalo, no es bloqueante.

Casos puntuales detectados:
- `dashboard/dashboard-client.tsx`: el `Select` mencionado arriba.
- `drivers-list-client.tsx`: revisá si el botón "Exportar" del list-header existe (también ocultarlo si está).
- `passengers-client.tsx`: idem.
- `ride-detail-client.tsx`: links "próximamente" si los hay.

### 13. Limpieza menor: archivo qr.png suelto

```bash
ls apps/dispatcher/qr.png
```

Si existe, borralo (es un artefacto de testing) y agregalo a `.gitignore` si querés ser prolijo: `apps/dispatcher/qr.png`.

## Verificación

Antes de commitear:

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev   # localhost:3001
```

Manual:
1. `/login` → click "¿Olvidaste tu contraseña?" → debe abrir dialog y mandar email real.
2. Loguearte como admin (`manu@gmail.com`).
3. Dashboard: el `Select` no debe ofrecer opciones que tiren toast.
4. Refresh: no debe sentirse falso/lento.
5. Sidebar: si sos admin, **no** debe estar "Despacho live".
6. `/admin/drivers/{id}` → tab Viajes → click una fila → navega a `/admin/rides/{id}`.
7. `/admin/drivers/{id}` → tab KYC → ya no muestra botón "Iniciar verificación".
8. `/admin/rides` → no muestra botón "Exportar CSV".
9. `/admin/team` → "Invitar miembro" → drawer NO muestra "TODO" ni SQL crudo.
10. `/admin/settings` → tab Cuenta → cambio de password funciona; toggle 2FA está deshabilitado con badge.
11. `/admin/settings` → no existe tab Integraciones.
12. Buscar global de `rg "próximamente" src/` → 0 hits visibles al usuario.

## Commit

```
fix(admin): purgar placeholders visibles al cliente

- Login: "¿Olvidaste contraseña?" funcional con resetPasswordForEmail
- Settings: cambio de password real con supabase.auth.updateUser
- Settings: 2FA toggle deshabilitado con badge "Próximamente"
- Settings: eliminada tab "Integraciones" con cards mock
- Team: drawer invite sin TODO crudo, instrucciones claras
- Dashboard: solo "Hoy" en period filter (resto vuelve en prompt 06)
- Dashboard: refresh real sin setTimeout artificial
- Sidebar: "Despacho live" oculto para admins
- KYC tab: botón "Iniciar verificación" eliminado
- Drivers tab Viajes: filas navegan a /admin/rides/[id]
- Rides list: botón "Export CSV" oculto (vuelve en prompt 03)
- Limpieza qr.png suelto
```

`git push` a `origin main` cuando esté limpio.
