# Prompt 2C — Dispatcher panel: skeleton Next.js 15

> **LEÉ:** `00_design_language.md` (sec 2 paleta, 8 densidad, 9 dispatcher layout), `00_arquitectura.md` (sec 1, 3 Next.js, 2.4 dispatcher), `00_file_ownership_matrix.md`.

## Objetivo

Panel del despachante booteable: login → app shell con **layout 3 columnas + barra inferior** vacío (placeholders por panel), modo oscuro default, fuentes y tokens del DS aplicados. Cero lógica de cola/asignación — chasis premium para que un despachante real abra y diga "esto se ve como un cockpit".

## File ownership

✍️ `apps/dispatcher/**`. NADA fuera. Importa read-only `@remis/design-system` y `@remis/shared-types`.

## Steps

### 1. Bootstrap

```bash
cd apps && pnpm create next-app@latest dispatcher --ts --tailwind --app --src-dir --use-pnpm
```

Configurar:
- React 19 + Next.js 15 App Router.
- Tailwind v4 con CSS-first config.
- `@remis/design-system` y `@remis/shared-types` como deps workspace.
- Fonts via `next/font/google` (Inter, Inter Tight, Geist Mono).

`package.json`:
```json
{
  "name": "dispatcher",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

Deps:
- `next`, `react`, `react-dom`
- `@supabase/ssr`, `@supabase/supabase-js`
- `react-hook-form`, `zod`, `@hookform/resolvers`
- `@tanstack/react-table`, `@tanstack/react-virtual`
- `react-hotkeys-hook`
- `cmdk` (command palette)
- `lucide-react`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `maplibre-gl`, `react-map-gl` (v8+ con MapLibre)
- `zustand` (estado cliente del dispatcher — UI state, no datos)
- `date-fns` con locale es

### 2. shadcn/ui setup

```bash
pnpm dlx shadcn@latest init
```

Configurar para usar nuestros tokens via Tailwind preset del DS. Componentes base a instalar:
`button`, `input`, `select`, `dialog`, `sheet`, `dropdown-menu`, `command`, `tabs`, `tooltip`, `toast`, `badge`, `separator`, `avatar`, `card`, `form`, `label`, `popover`, `scroll-area`.

**Después de instalar:** abrir cada `.tsx` de shadcn y mapear las clases default a nuestros tokens (ej. `bg-background` → `bg-neutral-0`, `text-foreground` → `text-neutral-800`). Documentar en `apps/dispatcher/src/components/ui/README.md` qué se modificó.

### 3. Estructura

```
apps/dispatcher/src/
├── app/
│   ├── layout.tsx                  # html, fonts, theme, globals
│   ├── globals.css                 # @import design-system tokens.css + tailwind
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # AppShell 3 cols + barra
│   │   ├── page.tsx                # vista default = mapa+cola
│   │   ├── rides/page.tsx          # placeholder
│   │   ├── drivers/page.tsx        # placeholder
│   │   └── reports/page.tsx        # placeholder
│   └── api/
│       └── health/route.ts
├── components/
│   ├── ui/                         # shadcn modificado
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── top-bar.tsx
│   │   ├── left-column.tsx
│   │   ├── center-column.tsx
│   │   ├── right-column.tsx
│   │   └── bottom-bar.tsx
│   └── command-palette.tsx
├── lib/
│   ├── supabase/{client,server,realtime}.ts
│   ├── env.ts                      # zod-validated
│   └── utils.ts                    # cn() helper
├── hooks/
│   └── use-shortcut-help.ts        # ? abre modal con shortcuts
└── stores/
    └── ui-store.ts                 # Zustand: density, sidebar collapse, modals
```

### 4. `app/layout.tsx`

```tsx
import { Inter, Inter_Tight, Geist_Mono } from 'next/font/google';
import '@remis/design-system/css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-family-body' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-family-display' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-family-mono' });

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${interTight.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

Default `data-theme="dark"` — no negociable para dispatcher.

### 5. AppShell — el corazón del dispatcher

`(dashboard)/layout.tsx` arma el layout fijo:

```tsx
<div className="grid h-screen grid-cols-[280px_1fr_360px] grid-rows-[56px_1fr_44px]">
  <TopBar className="col-span-3" />
  <LeftColumn />     {/* cola de pedidos + lista choferes */}
  <CenterColumn />   {/* mapa o grilla de zonas */}
  <RightColumn />    {/* nuevo pedido + cola activa */}
  <BottomBar className="col-span-3" />
</div>
```

#### TopBar (h56)

```
┌────────────────────────────────────────────────────────────────┐
│ [LOGO]  KPIs: 12 lib · 5 yendo · 3 esp · 8 ocup · 4 off  ⏰ 14:32  [🔍 buscar]  [⚙️] [👤]  │
└────────────────────────────────────────────────────────────────┘
```

KPIs: cada uno es chip pequeño con dot de color del estado + número (mono). Mock counts por ahora.
Reloj live (cada minuto refresh).
Buscador: command palette (Cmd/Ctrl+K) — placeholder con `cmdk`.

#### LeftColumn (w280)

Tabs arriba: "Choferes" / "Pedidos". Solo "Choferes" visible activa por ahora.
Lista de choferes con:
- Avatar circular 32px
- Móvil interno (mono, "12") + nombre
- DriverStatusPill
- Tiempo en estado ("Libre desde 14:20")
- Distancia desde dispatch (placeholder)

Lista vacía con placeholder "Sin choferes online" + ilustración minimal.

#### CenterColumn

Toggle arriba: **[Mapa | Zonas]** (segmented control).
- Mapa: `react-map-gl` con MapLibre, estilo dark custom. Placeholder pins de choferes mock.
- Zonas: grilla 2×2 de cards de zona, cada una con conteo de choferes y pedidos.

#### RightColumn (w360)

Tabs: "Nuevo pedido" / "Cola (8)" / "Programados (3)".
- Nuevo pedido: form con `react-hook-form` + zod (campos: teléfono, nombre, pickup, destino, notas). Hotkey `Espacio` lo enfoca.
- Cola: lista virtualizada con cards de pedidos (placeholder mock).
- Programados: lista similar.

#### BottomBar (h44)

Strip de:
- Mensajes con choferes (badge si hay nuevos).
- Alertas activas (count).
- Próximos programados (next 30 min).
- Help [?] que abre modal de shortcuts.
- Indicador de conexión Realtime (dot verde / amarillo / rojo).

### 6. Login page

`(auth)/login/page.tsx`. Centrado, simple:
- Card 480×auto `--neutral-100` con logo + título "Panel de despacho".
- Inputs email + password (despachantes usan email/password, no OTP — más rápido al inicio del turno).
- Botón "Entrar" `RButton.primary lg`.
- Link "¿Olvidaste tu contraseña?" pequeño.
- Versión footer.

Lógica: `signInWithPassword`. Solo permite role `dispatcher` o `admin` — si entra otro role, mostrar error y signOut.

Server-side guard en `(dashboard)/layout.tsx`:
```ts
const supabase = createServerClient(...);
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
if (!['dispatcher', 'admin'].includes(profile?.role)) redirect('/login');
```

### 7. Realtime singleton

`lib/supabase/realtime.ts`: helper que arma canales y los reusa. Conexión inicial al montar `(dashboard)/layout.tsx`. Reconexión exponencial si cae.

Indicador visual de conexión en `BottomBar`.

### 8. Command palette

`Cmd/Ctrl+K` abre `<Command>` de cmdk. Acciones placeholder:
- "Nuevo pedido" → focus form (Espacio).
- "Asignar" → placeholder.
- "Buscar pasajero" → placeholder.
- "Buscar viaje #" → placeholder.
- "Cambiar densidad" → submenu.
- "Cerrar sesión".
- "Atajos" → modal con tabla.

### 9. Toggle de densidad

Cmd/Ctrl + 1/2/3 cambia densidad (`comfortable | compact | dense`). Persistido en Zustand + localStorage. Aplica clases `data-density="dense"` al root del shell. Tablas, listas, paddings reaccionan.

### 10. Modo dark / light toggle

Despachante puede cambiar manualmente (algunos prefieren day-mode con luz alta). En `TopBar` settings dropdown. Default `dark`.

### 11. globals.css

```css
@import "@remis/design-system/css/tokens.css";
@import "tailwindcss";
@config "../../tailwind.config.ts";

/* Layout helpers */
[data-density="comfortable"] { --row-height: 56px; --row-padding: 16px; }
[data-density="compact"]     { --row-height: 44px; --row-padding: 12px; }
[data-density="dense"]       { --row-height: 32px; --row-padding: 8px; }

/* Scrollbars finitos */
* { scrollbar-width: thin; scrollbar-color: var(--neutral-400) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: var(--neutral-400); border-radius: 4px; }
```

### 12. Performance

- Server Components por default; `'use client'` solo donde necesite (mapa, forms, command palette, columns con interacción).
- `next/dynamic` para MapLibre (es client-only, evita SSR errors).
- Imágenes con `next/image`.

### 13. Accessibility

- Skip-link a contenido principal.
- ARIA labels en cada landmark.
- Focus visible en TODO control.
- Dialog modals con focus trap (shadcn ya lo da).

## Acceptance criteria

- [ ] `pnpm dev` levanta dispatcher en :3001.
- [ ] Login funciona contra Supabase local.
- [ ] Layout 3 cols + topbar + bottombar visible con placeholders.
- [ ] Cmd/K abre command palette.
- [ ] Cmd/1-2-3 cambia densidad (visible en padding y row heights).
- [ ] Dark default; toggle a light funciona.
- [ ] Mapa MapLibre renderiza con estilo dark.
- [ ] Indicador Realtime conecta y muestra verde.
- [ ] `pnpm typecheck` clean.
- [ ] Commit `feat(dispatcher): bootable shell with auth and 3-column layout`.

## Out of scope

- Lógica real de cola, asignación, drivers (Tanda 3C).
- Caller-ID (Tanda 4C).
- Multi-monitor (Tanda 4C).
- Reportes (Tanda 5).

## Notas

- **MapLibre style:** crear `public/map-style-dark.json` minimal o usar uno OSS apuntando a un tile server gratis (ej. MapTiler con free tier). Documentar la elección.
- **Mock data:** mientras Tanda 3C no llega, hardcodear 8 choferes mock en `lib/mock/drivers.ts` para que la UI luzca poblada en demos al cliente.
- **Modal de shortcuts (?):** ya prepará la tabla con todos los shortcuts del documento de arquitectura — aunque no funcionen aún, mostrarlos.
