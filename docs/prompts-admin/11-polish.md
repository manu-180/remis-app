# Sesión 11 — Polish: command palette, empty states, perf, atajos, tests críticos

> **Sesiones previas**: 00 → 10.

---

## Objetivo

Pulido final del admin para que se sienta **terminado**: command palette robusto con todas las acciones, empty states ilustrados, atajos de teclado por página, página pública `/shared/[token]`, perf audit, code splitting de mapas, y un puñado de tests Playwright críticos para que no se rompa lo principal.

---

## Entregables

### Parte A — Command Palette completo

Expandir `apps/dispatcher/src/components/admin/command-palette.tsx`:

Categorías:
- **Ir a**: cada página del admin con su icon. Search por nombre.
- **Acciones rápidas**:
  - "Crear conductor" → abre drawer en `/admin/drivers`
  - "Crear viaje manual" → abre drawer (en sesión 06 se dejó TODO; si está, conectar)
  - "Buscar pasajero por teléfono" → input inline → navega
  - "Resolver SOS" → solo si hay activos, abre el primero
- **Cambiar tema**: Light / Dark / Auto
- **Cambiar densidad**: Comfortable / Compact / Dense
- **Ayuda**: Atajos de teclado (abre modal), Soporte (mailto)
- **Cerrar sesión**

Triggers: `Cmd+K` / `Ctrl+K` global. En el dispatcher live también funciona pero con acciones distintas (que ya existen ahí).

Estética premium:
- Backdrop blur fuerte
- Modal centrado, max-w 640px, max-h 480px scroll
- Items con icon, label, optional shortcut hint a la derecha (kbd estilo)
- Hover y selected state distintos
- Loading state mientras busca async
- Empty: "Sin resultados para X" + "Intentá con menos palabras"

### Parte B — Empty states ilustrados

Crear `apps/dispatcher/src/components/admin/illustrations/`:

5 SVG ilustraciones inline (no asset externo):
1. `empty-rides.tsx` — un auto simplificado en líneas
2. `empty-drivers.tsx` — figura humana con casco
3. `empty-passengers.tsx` — figura humana con bolso
4. `empty-payments.tsx` — billete + monedas
5. `empty-search.tsx` — lupa con marca de pregunta

Estilo: line art monocromático con `currentColor`, 200×160px, simples geométricas.

Reemplazar placeholders genéricos en cada página con la ilustración correspondiente:
- `/admin/rides` empty → `empty-rides`
- `/admin/drivers` → `empty-drivers`
- `/admin/passengers` → `empty-passengers`
- `/admin/payments` → `empty-payments`
- Search vacío en cualquier filtro → `empty-search`

Texto microcopy en español rioplatense:
- "Acá no hay nada todavía. Sumá el primer conductor."
- "Aún no hay viajes en este rango. Probá ampliando las fechas."
- "Sin resultados. Reformulá la búsqueda."

### Parte C — Atajos de teclado por página

Definir un sistema de "shortcuts" registrado por página:

```ts
// hooks/use-page-shortcuts.ts
export function usePageShortcuts(shortcuts: { key: string; description: string; handler: () => void }[])
```

Las páginas registran:
- `/admin` (dashboard): `R` → refresh, `T` → cambiar período
- `/admin/drivers`: `N` → nuevo conductor, `/` → focus search
- `/admin/rides`: `N` → nuevo viaje (si implementado), `/` → focus search, `E` → export
- `/admin/sos`: `R` → resolver primero activo (con confirm), `1`/`2`/`3` → abre el N-ésimo activo
- Global: `?` → abre modal de atajos visible

Modal "Atajos de teclado":
- Cmd+/ o `?` lo abre
- Lista organizada por contexto (Global, Página actual)
- Glass surface, kbd-styled keys

### Parte D — Página pública `/shared/[token]`

Crear `apps/dispatcher/src/app/shared/[token]/page.tsx` (segmento público, fuera de `(admin)` y `(dashboard)`).

- Server Component que llama RPC `get_shared_trip(p_token)`.
- Si no existe / expirado → 404 con mensaje amigable.
- Si OK: layout limpio, NO admin shell:
  - Header simple con logo + "Compartido por @nombre"
  - Hero: status del viaje, origen → destino, ETA si activo
  - Mapa fullscreen con ruta + driver actual (live si activo)
  - Info conductor (nombre, foto, vehículo, rating) — sin teléfono ni datos sensibles
  - Footer "Powered by RemisDespacho"
- Auto-refresh cada 30s (re-fetch del RPC).
- Sin auth.

Esta página cierra el círculo del feature `trip_share_enabled`.

### Parte E — Perf audit y code splitting

#### Code splitting

Cualquier import de MapLibre debe ser dynamic + ssr:false. Auditar todos los archivos que importen `maplibre-gl` directo y wrap-earlos:

```ts
const ZoneEditor = dynamic(() => import('@/components/admin/zones/zone-editor'), { ssr: false, loading: () => <Skeleton /> });
```

Páginas afectadas: `/admin` (heatmap), `/admin/zones`, `/admin/fares` (simulator), `/admin/rides/[id]` (route map), `/admin/drivers/[id]` (location tab), `/admin/sos/[id]` (trail map).

#### Bundle audit

Correr `pnpm build` y revisar el output. Si alguna chunk supera 250KB (gzip), buscar la causa.

#### Web Vitals

Verificar que `web-vitals` ya reporta a Sentry/PostHog (existe `@/lib/observability/web-vitals.ts`). Validar dashboards.

#### Imágenes

Si hay avatares grandes, configurar `next/image` con `remotePatterns` apuntando al dominio de Supabase Storage en `next.config.ts`.

### Parte F — Tests Playwright

Crear `apps/dispatcher/e2e/`:

#### `admin-smoke.spec.ts`
- Login como admin → asserts en `/admin` URL
- Sidebar visible con todos los items
- Click cada item del sidebar → assert URL correcta
- Theme toggle → asserts `data-theme` cambia

#### `drivers-crud.spec.ts`
- Login admin
- Click "Nuevo conductor" → drawer abre
- Llenar wizard (mockear creación con interceptor)
- Verificar que aparece en la lista (filter por nombre creado)

#### `sos-flow.spec.ts`
- Setup: insertar un sos_event via API REST de Supabase con service role en beforeAll
- Login admin → ir a `/admin/sos` → assert lista tiene 1 activo
- Click → detalle muestra info correcta
- Click "Resolver" → modal → notas → submit
- Volver a lista → activo no aparece

#### `dashboard-loads.spec.ts`
- Login admin → `/admin` carga
- KPIs muestran valores numéricos (no Skeleton después de 3s)
- Sparkline visible (svg con N rects)

> Si no hay infra de test contra Supabase, usar mocks con MSW o interceptar con Playwright `page.route`.

Ya existe `playwright.config.ts`. Asegurar que tests corren con `pnpm test:e2e`.

### Parte G — Documentación rápida

Crear `apps/dispatcher/README.md` (si no existe) con:

- Cómo correr en dev
- Qué requiere el `.env`
- Cómo crear un usuario admin (SQL snippet)
- Lista de páginas y URLs
- Cómo se ejecutan tests

### Parte H — Loose ends

Recorrer las TODOs que quedaron en sesiones anteriores:
- Crear viaje manual desde `/admin/rides` (drawer)
- Reverse geocoding optativo
- Edge functions admin-create-driver / admin-invite-staff (si quedaron pendientes)
- Reembolso real con MP (DEJAR como TODO documentado en `docs/TODO.md`)

Decidí cuáles son blocker para demo y cuáles van a `docs/TODO.md`.

### Parte I — Accesibilidad audit

Correr `axe-core` en cada página clave:

```bash
pnpm dlx @axe-core/cli http://localhost:3001/admin
```

Resolver issues críticos. No exigimos AAA, pero AA limpio.

Específicos a verificar:
- Foco visible en todos los interactivos (focus-ring dorado)
- Labels en todos los form fields
- Roles ARIA correctos en menus, dialogs, tabs
- Contraste de texto AA mínimo
- `prefers-reduced-motion` respetado en animaciones
- Trap de foco en dialogs
- Skip-link al main funcional

---

## Detalles premium finales

- **Command palette**: cuando se abre, fade del backdrop + scale-in del modal con `--ease-spring`. Cuando se cierra, scale-down + fade.
- **Atajo `?`**: el modal entra desde el bottom con bounce sutil.
- **Empty states ilustrados**: las ilustraciones tienen un sutil floating animation (translateY ±2px loop 3s).
- **Shared trip**: el mapa tiene un overlay glass con la info del trip que es el único elemento; minimalista y calmo (recordar que es para los seres queridos esperando al pasajero).
- **Perf**: tiempo de carga de cada página clave debe ser < 1.2s en LCP en dev.
- **Tests**: nombrarlos descriptivos en español ("admin puede crear un conductor exitosamente").

---

## Validación

1. `pnpm typecheck`, `pnpm lint`, `pnpm build` limpios.
2. Bundle inspection: ningún chunk > 250KB gzip.
3. `pnpm test:e2e` pasa los 4 specs.
4. Visitar todas las URLs sin errores de consola.
5. Lighthouse a11y > 95 en `/admin`, `/admin/drivers`, `/admin/rides`, `/shared/[token]`.
6. Responsive check: 320px, 768px, 1280px, 1920px en cada página principal.
7. Kbd shortcuts: `Cmd+K`, `?`, `/`, página-específicos.
8. Theme + density toggle persistente.

---

## No hacer

- ❌ Reescribir cosas de sesiones anteriores (solo polish)
- ❌ Agregar features nuevas grandes
- ❌ Migrar a otra lib

---

## Commit final

```bash
git add .
git commit -m "polish(admin): command palette, illustrations, perf splits, e2e tests, a11y audit"
git push
```

---

## 🎉 Cuando termines esta sesión

El admin está **listo para demo**.

Verificá una última vez:
1. `pnpm dev` → todo funciona end-to-end
2. Tomá 6 screenshots clave (dashboard, drivers, ride detail, SOS, zones, fares simulator) en Light y Dark
3. Hacé un Loom corto de 90 segundos navegando el admin
4. Compartí con quien sea que pidió la demo

Buen trabajo. 🚀
