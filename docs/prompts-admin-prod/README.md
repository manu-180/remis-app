# Plan de pulido pre-demo — Admin Web (apps/dispatcher)

> Esta carpeta contiene **12 prompts secuenciales** para llevar el admin web del estado actual ("12 prompts originales todos hechos pero con deuda visible") al estado **"demo a un potencial cliente"**.
> Cada archivo está pensado para ejecutarse en **una sesión nueva de Claude Code**, sin contexto previo.

---

## ¿Qué es esta carpeta y por qué existe?

Los 12 prompts originales en `docs/prompts-admin/` construyeron las páginas del admin (dashboard, drivers, rides, sos, zones, fares, kyc, audit, team, settings, etc). Todas existen y compilan.

Pero al usar el admin con datos reales seedeados (`docs/seeds/demo-seed.sql`) aparecen **huecos visibles** que matan la sensación de producto terminado:

- `alert('Funcionalidad en desarrollo')` nativos del browser
- Toasts `'Pronto disponible'` en filtros del dashboard
- Botones "Exportar CSV" que mienten (toast info, no descargan nada)
- Drawers con `<strong>TODO:</strong>` literal expuesto al cliente
- Cero `error.tsx` / `loading.tsx` por segmento → cualquier error = pantalla blanca
- Filtros con SQL injection por concatenar strings en `.or(...)`
- Páginas `[id]` que crashean si el UUID no es válido
- Listas sin paginación que explotan con volumen
- Sentry replay capturando texto sin máscara (PII visible)
- Etc.

Los 12 prompts de esta carpeta cierran esos huecos en orden de impacto. Después de aplicar los 12, el admin debería sentirse como "producto terminado para un piloto cerrado".

**Lo que NO está acá** (skipeado por decisión explícita del cliente, ver criterios al final):
- Refunds reales con MercadoPago API
- Compliance AAIP / GDPR-equivalent
- 2FA productivo (se deja como "próximamente" pulido)
- Logo upload a Storage (input de URL es defendible)
- Push web notifications
- Heartbeat monitor / SLOs / Telegram alerts

---

## Cómo usar esto

1. Abrí una sesión nueva de Claude Code en `C:/MisProyectos/clientes/remis_app/`.
2. Pegá el contenido de `00-purgar-placeholders.md` (o el siguiente en orden).
3. Dejá que Claude trabaje. Al final, hacés `git add . && git commit -m "..." && git push`. Cada prompt indica el formato del commit.
4. Cerrá la sesión, abrís otra, y vas con el siguiente prompt.
5. **No saltees pasos.** Cada prompt asume que los anteriores están en `main`.

---

## Mapa de prompts

| # | Archivo | Foco | Tiempo | Sale con |
|---|---------|------|--------|----------|
| 00 | [00-purgar-placeholders.md](./00-purgar-placeholders.md) | Eliminar `alert()`, TODOs visibles, toasts "próximamente", links muertos, tab Integraciones placeholder, "Despacho live" mal redirigido | 1.5h | Cero placeholders cantados al cliente |
| 01 | [01-error-loading-not-found.md](./01-error-loading-not-found.md) | `error.tsx`, `loading.tsx`, `not-found.tsx` por segmento + `global-error` premium + Sentry capture | 1.5h | Ninguna pantalla blanca |
| 02 | [02-robustez-validacion.md](./02-robustez-validacion.md) | UUID regex en `[id]` server components, `.maybeSingle()`, escape de filtros `.or()`, `env.ts` no-throw cliente | 1h | App no crashea con inputs raros |
| 03 | [03-export-csv-real.md](./03-export-csv-real.md) | Export CSV real en rides / drivers / passengers / payments con util compartido | 1.5h | Botón Export descarga CSV de verdad |
| 04 | [04-team-invite-real.md](./04-team-invite-real.md) | Edge function `admin-invite-staff` + UI invite premium con email real (vía `supabase.auth.admin.inviteUserByEmail`) | 2h | Equipo se invita por mail, sin TODO |
| 05 | [05-password-2fa.md](./05-password-2fa.md) | Cambio de password real + 2FA TOTP con Supabase MFA (o "próximamente" pulido si MFA escala) | 2h | Settings ya no usa `alert()` |
| 06 | [06-dashboard-period-clickable.md](./06-dashboard-period-clickable.md) | Filtros de período 7d / 30d / hoy reales, refresh real, top-drivers clickeables, activity feed con links | 1.5h | Dashboard se siente vivo |
| 07 | [07-rides-detalle-completo.md](./07-rides-detalle-completo.md) | Reasignar conductor, generar `/shared/[token]` desde detalle, mensajes con write, navegación cards driver/vehicle | 2h | Ride detail es operativo |
| 08 | [08-sos-mapa-acciones.md](./08-sos-mapa-acciones.md) | Mapa con todos los SOS activos, notificar contactos externos, `dispatched_at`/`dispatched_by`, fix `tel:` desktop | 1.5h | Centro SOS deja de ser placeholder |
| 09 | [09-paginacion-perf-build.md](./09-paginacion-perf-build.md) | Paginar payments / webhooks / audit server-side, sticky `--max-old-space-size`, script `pnpm supabase:types` | 1.5h | App escala a 5k+ pagos sin freezar |
| 10 | [10-security-pii-observability.md](./10-security-pii-observability.md) | Sentry `maskAllText:true`, PostHog admin disable, middleware auth, `onRequestError` hook, `useSupabaseQuery` → Sentry, NEXT_PUBLIC sanear | 2h | "Tus datos no salen" defensible |
| 11 | [11-shared-trip-mapa.md](./11-shared-trip-mapa.md) | `/shared/[token]` con mapa MapLibre + posición conductor en realtime + ETA refresh + botón llamar | 2h | Pública vista del viaje impresiona |
| 12 | [12-polish-final-a11y.md](./12-polish-final-a11y.md) | a11y axe pass, focus rings auditados, microcopy review, confirms consistentes en destructivas, KYC fotos premium, refund con warning | 2h | Pasa axe-core sin críticos |

**Tiempo total estimado: ~20 horas** distribuibles en una semana de trabajo enfocado.

---

## Stack y reglas no negociables

- **Stack confirmado**: Next.js 15 (App Router, Turbopack), React 19, TypeScript estricto, Tailwind v4 (CSS-first con `@theme` en `globals.css`), Supabase SSR (`@supabase/ssr`), MapLibre GL JS + react-map-gl, TanStack Table v8, Zustand, react-hook-form + zod, Sentry, PostHog, react-hotkeys-hook.
- **NO crear branches.** Trabajar en `main` directo. Commits pequeños y frecuentes. `git push` después de cada commit (regla del proyecto).
- **NO usar worktrees.**
- **NO sugerir alternativas** a Supabase / Next.js / Tailwind / Flutter / Riverpod.
- **MCP de Supabase disponible** (`mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__*`). Project ID: `kmdnsxbpzidpkinlablf`. Usalo para schema queries, ejecutar SQL, regenerar tipos, deployar edge functions.
- **Tipos Supabase** en `packages/shared-types/database.ts`. Si te falta algo regeneralo con el MCP (`generate_typescript_types`) y guardá el resultado.
- **Workaround conocido**: `(supabase.rpc as any)` y `(supabase.from(...) as any)` para sortear bug de inferencia en postgrest-js. No es necesario fixear, solo seguilo.
- **Premium siempre**: si el componente no se ve premium, no está terminado. Animaciones <240ms, focus rings dorados, tabular-nums para números, microcopy en español rioplatense.
- **Antes de terminar la sesión**: `pnpm typecheck` y `pnpm lint` en `apps/dispatcher` deben pasar limpios.
- **Build**: requiere `NODE_OPTIONS=--max-old-space-size=4096`. El prompt 09 lo deja sticky en el `package.json`.
- **Commit final**: mensaje convencional (`feat(admin): ...`, `fix(admin): ...`, `refactor(admin): ...`) y `git push` a `origin main`.

---

## Schema relevante (atajo)

Tablas principales con RLS:
- `profiles`, `drivers`, `vehicles`, `passengers`, `rides`, `ride_events`, `payments`, `mp_webhook_events`, `tariff_zones`, `fares`, `kyc_verifications`, `driver_documents`, `driver_current_location`, `sos_events`, `notifications`, `messages`, `audit_log`, `feature_flags`, `ride_ratings`, `org_settings`, `frequent_addresses`, `shared_trips`.

RPCs disponibles: `assign_ride`, `cancel_ride`, `start_trip`, `end_trip`, `driver_arrived_pickup`, `find_nearest_available_drivers`, `estimate_fare`, `get_shared_trip`, `create_shared_trip`, `get_shift_summary`, `admin_resolve_kyc`, `audit_log_hash_chain`, `is_admin()`, `is_dispatcher_or_admin()`, `current_user_role()`.

Edge functions ya deployadas: `kyc-create-session`, `driver-heartbeat`, `admin-create-driver`, `mp-webhook`, `cron-alerts-monitor`. El prompt 04 agrega `admin-invite-staff`.

---

## Datos de demo

La base ya está seeded vía `docs/seeds/demo-seed.sql`:
- 18 conductores (`driver01@remisdemo.com` … `driver18@remisdemo.com`, password `demo1234`)
- 41 pasajeros (`pax01@remisdemo.com` … `pax40@remisdemo.com`, password `demo1234`)
- 159 viajes en últimos 30 días (125 completed, 6 requested cola live, 8 activos, 20 cancelados)
- 125 payments, 95 ratings, 18 KYC verifications, 126 driver_documents, 12 ubicaciones live
- 4 zonas tarifarias (Centro / Norte / Sur / Periferia, alrededor de Santa Rosa LP)
- 17 fares, 6 feature_flags, 24+ audit_log entries

Admin: `manu@gmail.com` (usar tu password actual).

Si necesitás resetear el seed: ver bloque de `DELETE` comentado al final de `docs/seeds/demo-seed.sql`.

---

## Verificación final (cuando los 12 estén hechos)

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint && pnpm build
pnpm test:e2e   # Playwright
pnpm dev        # http://localhost:3001
```

Recorrido manual sugerido para validar la demo:
1. `/login` con admin → entra a `/admin`
2. Recorrer dashboard, ver KPIs vivos, click en top driver / activity feed
3. `/admin/drivers` → click en uno → tabs (resumen, viajes, ubicación, kyc, documentos, vehículo)
4. `/admin/rides` → click en uno → mensajes, mapa, reasignar, compartir
5. `/admin/sos` → ver mapa con activos, abrir uno
6. `/admin/zones` → editar polígono
7. `/admin/fares` → simular tarifa
8. `/admin/kyc` → aprobar/rechazar
9. `/admin/team` → invitar (debe mandar email de verdad)
10. `/admin/settings` → cambiar password real, ver organización
11. `/admin/audit` → ver hash chain
12. Salir, abrir `/shared/<token>` (generado en paso 4) → ver mapa vivo
13. Forzar un error (URL inválida, ID UUID truchado) → confirmar que se ve bonito (no pantalla blanca)
