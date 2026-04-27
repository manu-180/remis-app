# Dispatcher Panel Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bootable Next.js 15 dispatcher panel with 3-column layout, Supabase auth (dispatcher/admin only), MapLibre map, command palette, density toggle, and dark mode — zero business logic, pure skeleton.

**Architecture:** App Router con route groups `(auth)` y `(dashboard)`. Server Components por defecto; `'use client'` solo en mapa, columnas con estado, command palette y forms. Auth guard en `(dashboard)/layout.tsx` vía `createServerClient`. Zustand para UI state puro (density, theme, modals) — sin datos de negocio.

**Tech Stack:** Next.js 15, React 19, Tailwind v4 (CSS-first), shadcn/ui, @supabase/ssr, react-map-gl + maplibre-gl, cmdk, react-hotkeys-hook, Zustand, Zod, react-hook-form, @tanstack/react-table + virtual, lucide-react.

**Nota crítica:** `packages/design-system/` no existe (Tanda 1B pendiente). Los tokens CSS se incrustan inline en `globals.css` con un comentario `TODO: migrar a @remis/design-system/css/tokens.css cuando Tanda 1B esté completa`.

---

## File Map

| Archivo | Responsabilidad |
|---------|----------------|
| `apps/dispatcher/package.json` | Scripts, deps, nombre workspace |
| `apps/dispatcher/next.config.ts` | Config Next.js (transpile packages) |
| `apps/dispatcher/tsconfig.json` | TS strict + paths |
| `apps/dispatcher/.env.local.example` | Vars de entorno necesarias |
| `apps/dispatcher/public/map-style-dark.json` | Estilo MapLibre oscuro (OSS) |
| `apps/dispatcher/src/app/layout.tsx` | Root layout: fonts, dark theme por defecto |
| `apps/dispatcher/src/app/globals.css` | Tokens CSS inlineados + Tailwind v4 |
| `apps/dispatcher/src/app/(auth)/login/page.tsx` | Login email+password, solo dispatcher/admin |
| `apps/dispatcher/src/app/(dashboard)/layout.tsx` | Auth guard server-side + AppShell |
| `apps/dispatcher/src/app/(dashboard)/page.tsx` | Redirect a /rides o home del dashboard |
| `apps/dispatcher/src/app/(dashboard)/rides/page.tsx` | Placeholder cola de pedidos |
| `apps/dispatcher/src/app/(dashboard)/drivers/page.tsx` | Placeholder lista choferes |
| `apps/dispatcher/src/app/(dashboard)/reports/page.tsx` | Placeholder reportes |
| `apps/dispatcher/src/app/api/health/route.ts` | Health check: toca Supabase, devuelve status |
| `apps/dispatcher/src/lib/env.ts` | Vars validadas con Zod (falla rápido en startup) |
| `apps/dispatcher/src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `apps/dispatcher/src/lib/supabase/client.ts` | Browser Supabase client (singleton) |
| `apps/dispatcher/src/lib/supabase/server.ts` | Server Supabase client (cookies, RSC-safe) |
| `apps/dispatcher/src/lib/supabase/realtime.ts` | Singleton de canales Realtime |
| `apps/dispatcher/src/lib/mock/drivers.ts` | 8 choferes mock para demos |
| `apps/dispatcher/src/stores/ui-store.ts` | Zustand: density, theme, modals open |
| `apps/dispatcher/src/hooks/use-shortcut-help.ts` | Hook: toggle modal de shortcuts |
| `apps/dispatcher/src/components/ui/` | shadcn modificado con nuestros tokens |
| `apps/dispatcher/src/components/layout/app-shell.tsx` | Grid 3-cols root |
| `apps/dispatcher/src/components/layout/top-bar.tsx` | KPIs + reloj + search trigger |
| `apps/dispatcher/src/components/layout/left-column.tsx` | Tabs Choferes/Pedidos + lista mock |
| `apps/dispatcher/src/components/layout/center-column.tsx` | Toggle Mapa/Zonas + MapLibre |
| `apps/dispatcher/src/components/layout/right-column.tsx` | Tabs Nuevo pedido/Cola/Programados |
| `apps/dispatcher/src/components/layout/bottom-bar.tsx` | Estado Realtime + shortcuts help |
| `apps/dispatcher/src/components/command-palette.tsx` | cmdk Cmd+K |
| `apps/dispatcher/src/middleware.ts` | Refresca cookies de sesión Supabase en cada request |

---

## Task 1: Bootstrap del paquete (package.json + next.config.ts + tsconfig.json)

**Files:**
- Create: `apps/dispatcher/package.json`
- Create: `apps/dispatcher/next.config.ts`
- Create: `apps/dispatcher/tsconfig.json`
- Create: `apps/dispatcher/.env.local.example`

- [ ] **Step 1.1: Crear directorio y package.json**

```bash
mkdir -p apps/dispatcher/src/app apps/dispatcher/public
```

Crear `apps/dispatcher/package.json`:

```json
{
  "name": "dispatcher",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.4",
    "@remis/shared-types": "workspace:*",
    "react-hook-form": "^7.56.0",
    "zod": "^3.24.2",
    "@hookform/resolvers": "^3.10.0",
    "@tanstack/react-table": "^8.21.3",
    "@tanstack/react-virtual": "^3.13.5",
    "react-hotkeys-hook": "^4.6.1",
    "cmdk": "^1.1.1",
    "lucide-react": "^0.503.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.2.0",
    "maplibre-gl": "^5.3.0",
    "react-map-gl": "^8.0.3",
    "zustand": "^5.0.3",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.7.2",
    "@tailwindcss/postcss": "^4.1.4",
    "tailwindcss": "^4.1.4",
    "eslint": "^9",
    "eslint-config-next": "^15.3.0"
  }
}
```

- [ ] **Step 1.2: Crear next.config.ts**

```ts
// apps/dispatcher/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@remis/shared-types'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
```

- [ ] **Step 1.3: Crear tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 1.4: Crear .env.local.example**

```bash
# apps/dispatcher/.env.local.example
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MAPLIBRE_STYLE_URL=/map-style-dark.json
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

Copiar como `.env.local` y completar con los valores del proyecto Supabase local:
```bash
cp apps/dispatcher/.env.local.example apps/dispatcher/.env.local
```

> ⚠️ **IMPORTANTE:** `env.ts` valida las vars en startup y lanza excepción si faltan. Si corrés `pnpm dev` sin `.env.local`, el servidor falla inmediatamente. Copiar y completar el archivo antes de cualquier comando.

- [ ] **Step 1.5: Instalar dependencias**

Desde la raíz del monorepo:
```bash
pnpm install
```

Verificar que `dispatcher` aparece en el workspace:
```bash
pnpm ls --filter dispatcher
```
Expected: lista de paquetes sin errores.

- [ ] **Step 1.6: Commit**

```bash
git add apps/dispatcher/package.json apps/dispatcher/next.config.ts apps/dispatcher/tsconfig.json apps/dispatcher/.env.local.example
git commit -m "chore(dispatcher): bootstrap package.json, next.config and tsconfig"
```

---

## Task 2: CSS tokens + globals.css + PostCSS

**Files:**
- Create: `apps/dispatcher/postcss.config.mjs`
- Create: `apps/dispatcher/src/app/globals.css`

- [ ] **Step 2.1: Crear postcss.config.mjs**

```js
// apps/dispatcher/postcss.config.mjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
```

- [ ] **Step 2.2: Crear globals.css con tokens inlineados**

`apps/dispatcher/src/app/globals.css`:

```css
/* TODO: migrar a @import "@remis/design-system/css/tokens.css" cuando Tanda 1B esté completa */
/* NOTE: @config omitido intencionalmente — Tailwind v4 CSS-first no requiere tailwind.config.ts
   cuando toda la configuración vive en CSS via @theme / @import. */
@import "tailwindcss";

/* ── BRAND ────────────────────────────────────────────────── */
:root {
  --brand-primary: #1B2A4E;
  --brand-primary-hover: #243762;
  --brand-accent: #D97706;
  --brand-accent-hover: #B45309;

  /* Neutrales light */
  --neutral-0:   #FFFFFF;
  --neutral-50:  #FAFAFA;
  --neutral-100: #F4F4F5;
  --neutral-200: #E4E4E7;
  --neutral-300: #D4D4D8;
  --neutral-400: #A1A1AA;
  --neutral-500: #71717A;
  --neutral-600: #52525B;
  --neutral-700: #3F3F46;
  --neutral-800: #27272A;
  --neutral-900: #18181B;

  /* Semánticos */
  --success:    #16A34A; --success-bg:  #F0FDF4;
  --warning:    #CA8A04; --warning-bg:  #FEFCE8;
  --danger:     #DC2626; --danger-bg:   #FEF2F2;
  --info:       #2563EB; --info-bg:     #EFF6FF;

  /* Tipografía */
  --text-2xs: 0.625rem;
  --text-xs:  0.75rem;
  --text-sm:  0.875rem;
  --text-base:1rem;
  --text-md:  1.125rem;
  --text-lg:  1.25rem;
  --text-xl:  1.5rem;
  --text-2xl: 1.875rem;
  --text-3xl: 2.25rem;
  --text-4xl: 3rem;

  /* Espaciado */
  --space-0: 0; --space-2: 0.125rem; --space-4: 0.25rem;
  --space-6: 0.375rem; --space-8: 0.5rem; --space-12: 0.75rem;
  --space-16: 1rem; --space-20: 1.25rem; --space-24: 1.5rem;
  --space-32: 2rem; --space-40: 2.5rem; --space-48: 3rem;
  --space-64: 4rem;

  /* Radii */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --radius-xl: 16px; --radius-2xl: 24px; --radius-full: 9999px;

  /* Sombras */
  --shadow-xs: 0 1px 2px rgba(15,23,42,.05);
  --shadow-sm: 0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
  --shadow-md: 0 4px 6px -1px rgba(15,23,42,.07), 0 2px 4px -2px rgba(15,23,42,.05);
  --shadow-lg: 0 10px 15px -3px rgba(15,23,42,.08), 0 4px 6px -4px rgba(15,23,42,.05);
  --shadow-xl: 0 20px 25px -5px rgba(15,23,42,.10), 0 8px 10px -6px rgba(15,23,42,.08);

  /* Motion */
  --ease-out: cubic-bezier(0.16,1,0.3,1);
  --ease-in:  cubic-bezier(0.7,0,0.84,0);
  --dur-instant: 80ms; --dur-fast: 150ms;
  --dur-normal: 240ms; --dur-slow: 360ms;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --brand-primary: #7CA0FF;
  --brand-primary-hover: #9CB7FF;
  --brand-accent: #F59E0B;
  --brand-accent-hover: #FBBF24;

  --neutral-0:   #0A0B0F;
  --neutral-50:  #101218;
  --neutral-100: #181B23;
  --neutral-200: #23262F;
  --neutral-300: #2E323D;
  --neutral-400: #52576B;
  --neutral-500: #7B8194;
  --neutral-600: #A4AABB;
  --neutral-700: #C7CCDB;
  --neutral-800: #E4E7EF;
  --neutral-900: #F4F5F9;

  --success:    #22C55E; --success-bg:  #0E2417;
  --warning:    #EAB308; --warning-bg:  #1F1B0E;
  --danger:     #EF4444; --danger-bg:   #27110F;
  --info:       #60A5FA; --info-bg:     #0E1B2D;
}

/* ── DENSITY ─────────────────────────────────────────────── */
[data-density="comfortable"] { --row-height: 56px; --row-padding: 16px; --row-font: 16px; }
[data-density="compact"]     { --row-height: 44px; --row-padding: 12px; --row-font: 14px; }
[data-density="dense"]       { --row-height: 32px; --row-padding:  8px; --row-font: 13px; }

/* ── GLOBAL ──────────────────────────────────────────────── */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--neutral-400) transparent;
}
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb {
  background: var(--neutral-400);
  border-radius: 4px;
}

body {
  background-color: var(--neutral-0);
  color: var(--neutral-800);
  font-family: var(--font-family-body, Inter, sans-serif);
  -webkit-font-smoothing: antialiased;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  padding: 0.5rem 1rem;
  background: var(--brand-accent);
  color: #000;
  font-weight: 600;
  border-radius: var(--radius-md);
  z-index: 9999;
  transition: top var(--dur-fast) var(--ease-out);
}
.skip-link:focus { top: 1rem; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2.3: Commit**

```bash
git add apps/dispatcher/postcss.config.mjs apps/dispatcher/src/app/globals.css
git commit -m "chore(dispatcher): add CSS tokens inline and globals"
```

---

## Task 3: Root layout con fuentes

**Files:**
- Create: `apps/dispatcher/src/app/layout.tsx`

- [ ] **Step 3.1: Crear root layout.tsx**

```tsx
// apps/dispatcher/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Inter_Tight, Geist_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-family-body',
  display: 'swap',
});
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-family-display',
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-family-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Panel de despacho — Remisería',
  description: 'Panel de gestión y despacho',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      data-density="dense"
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${interTight.variable} ${geistMono.variable}`}
      >
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3.2: Verificar typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```
Expected: sin errores (puede haber warnings de módulos faltantes — es normal hasta Task 4).

- [ ] **Step 3.3: Commit**

```bash
git add apps/dispatcher/src/app/layout.tsx
git commit -m "feat(dispatcher): root layout with fonts and dark theme default"
```

---

## Task 4: Lib utilities (env, utils, supabase, mock)

**Files:**
- Create: `apps/dispatcher/src/lib/env.ts`
- Create: `apps/dispatcher/src/lib/utils.ts`
- Create: `apps/dispatcher/src/lib/supabase/client.ts`
- Create: `apps/dispatcher/src/lib/supabase/server.ts`
- Create: `apps/dispatcher/src/lib/supabase/realtime.ts`
- Create: `apps/dispatcher/src/lib/mock/drivers.ts`

- [ ] **Step 4.1: Crear lib/env.ts**

```ts
// apps/dispatcher/src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL: z.string().min(1).default('/map-style-dark.json'),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL: process.env['NEXT_PUBLIC_MAPLIBRE_STYLE_URL'],
});

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Variables de entorno inválidas. Revisar .env.local');
}

export const env = parsed.data;
```

- [ ] **Step 4.2: Crear lib/utils.ts**

```ts
// apps/dispatcher/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4.3: Crear lib/supabase/client.ts**

```ts
// apps/dispatcher/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@remis/shared-types/database';
import { env } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
```

- [ ] **Step 4.4: Crear lib/supabase/server.ts**

```ts
// apps/dispatcher/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@remis/shared-types/database';
import { env } from '@/lib/env';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies de sesión se setean en middleware
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4.5: Crear lib/supabase/realtime.ts**

```ts
// apps/dispatcher/src/lib/supabase/realtime.ts
'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

let dispatchChannel: RealtimeChannel | null = null;
let statusListeners: Array<(s: ConnectionStatus) => void> = [];

export function subscribeToConnectionStatus(cb: (s: ConnectionStatus) => void) {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== cb);
  };
}

function notifyStatus(s: ConnectionStatus) {
  statusListeners.forEach((l) => l(s));
}

export function getDispatchChannel(): RealtimeChannel {
  if (dispatchChannel) return dispatchChannel;

  const supabase = getSupabaseBrowserClient();
  notifyStatus('connecting');

  dispatchChannel = supabase.channel('dispatch:public', {
    config: { broadcast: { self: false } },
  });

  dispatchChannel
    .on('system', {} as never, (payload) => {
      if ((payload as { extension?: string }).extension === 'postgres_changes') return;
      notifyStatus('connected');
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') notifyStatus('connected');
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') notifyStatus('disconnected');
    });

  return dispatchChannel;
}

export function teardownRealtimeChannels() {
  if (dispatchChannel) {
    dispatchChannel.unsubscribe();
    dispatchChannel = null;
  }
  // Reset listeners to prevent accumulation on HMR (Next.js Fast Refresh re-evaluates modules)
  statusListeners = [];
}
```

- [ ] **Step 4.6: Crear lib/mock/drivers.ts**

```ts
// apps/dispatcher/src/lib/mock/drivers.ts

export type DriverStatus =
  | 'available'
  | 'en_route_to_pickup'
  | 'waiting_passenger'
  | 'on_trip'
  | 'on_break'
  | 'offline'
  | 'suspended';

export interface MockDriver {
  id: string;
  internalNumber: string;
  name: string;
  status: DriverStatus;
  statusSince: string; // "HH:MM"
  distanceKm: number | null;
  avatarInitials: string;
  // Pre-computed so map markers don't jitter on every re-render (Math.random() in render = bad)
  lngOffset: number;
  latOffset: number;
}

export const MOCK_DRIVERS: MockDriver[] = [
  { id: '1', internalNumber: '01', name: 'Carlos Pérez',    status: 'available',          statusSince: '14:20', distanceKm: 1.2, avatarInitials: 'CP', lngOffset:  0.012, latOffset:  0.008 },
  { id: '2', internalNumber: '04', name: 'Ana González',    status: 'on_trip',             statusSince: '14:35', distanceKm: 3.8, avatarInitials: 'AG', lngOffset: -0.015, latOffset:  0.011 },
  { id: '3', internalNumber: '07', name: 'Luis Martínez',   status: 'en_route_to_pickup',  statusSince: '14:41', distanceKm: 0.7, avatarInitials: 'LM', lngOffset:  0.003, latOffset: -0.009 },
  { id: '4', internalNumber: '10', name: 'María Rodríguez', status: 'available',           statusSince: '13:58', distanceKm: 2.1, avatarInitials: 'MR', lngOffset: -0.007, latOffset:  0.014 },
  { id: '5', internalNumber: '12', name: 'Diego Sosa',      status: 'waiting_passenger',   statusSince: '14:38', distanceKm: 0.4, avatarInitials: 'DS', lngOffset:  0.019, latOffset: -0.004 },
  { id: '6', internalNumber: '15', name: 'Laura Vidal',     status: 'on_break',            statusSince: '14:00', distanceKm: null, avatarInitials: 'LV', lngOffset:  0,     latOffset:  0 },
  { id: '7', internalNumber: '18', name: 'Roberto Campos',  status: 'offline',             statusSince: '12:30', distanceKm: null, avatarInitials: 'RC', lngOffset:  0,     latOffset:  0 },
  { id: '8', internalNumber: '21', name: 'Sofía Méndez',   status: 'available',           statusSince: '14:45', distanceKm: 1.9, avatarInitials: 'SM', lngOffset: -0.011, latOffset: -0.016 },
];

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  available:          'var(--success)',
  en_route_to_pickup: 'var(--info)',
  waiting_passenger:  'var(--warning)',
  on_trip:            'var(--danger)',
  on_break:           '#FACC15',
  offline:            'var(--neutral-500)',
  suspended:          '#A855F7',
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available:          'Libre',
  en_route_to_pickup: 'Yendo',
  waiting_passenger:  'Esperando',
  on_trip:            'En viaje',
  on_break:           'Descanso',
  offline:            'Offline',
  suspended:          'Suspendido',
};
```

- [ ] **Step 4.7: Typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```
Expected: sin errores críticos de tipos en los archivos creados hasta ahora.

- [ ] **Step 4.8: Commit**

```bash
git add apps/dispatcher/src/lib/
git commit -m "feat(dispatcher): add env validation, supabase clients, realtime, and mock data"
```

---

## Task 5: Zustand UI store

**Files:**
- Create: `apps/dispatcher/src/stores/ui-store.ts`

- [ ] **Step 5.1: Crear ui-store.ts**

```ts
// apps/dispatcher/src/stores/ui-store.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Density = 'comfortable' | 'compact' | 'dense';
export type Theme = 'dark' | 'light';

interface UIState {
  density: Density;
  theme: Theme;
  isCommandPaletteOpen: boolean;
  isShortcutHelpOpen: boolean;

  setDensity: (d: Density) => void;
  setTheme: (t: Theme) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleShortcutHelp: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      density: 'dense',
      theme: 'dark',
      isCommandPaletteOpen: false,
      isShortcutHelpOpen: false,

      setDensity: (density) => {
        set({ density });
        document.documentElement.dataset['density'] = density;
      },
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.dataset['theme'] = theme;
      },
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleShortcutHelp: () =>
        set((s) => ({ isShortcutHelpOpen: !s.isShortcutHelpOpen })),
    }),
    {
      name: 'dispatcher-ui',
      partialize: (s) => ({ density: s.density, theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.dataset['density'] = state.density;
          document.documentElement.dataset['theme'] = state.theme;
        }
      },
    },
  ),
);
```

- [ ] **Step 5.2: Crear hook use-shortcut-help.ts**

```ts
// apps/dispatcher/src/hooks/use-shortcut-help.ts
'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useUIStore } from '@/stores/ui-store';

export function useShortcutHelp() {
  const toggle = useUIStore((s) => s.toggleShortcutHelp);
  useHotkeys('?', toggle, { preventDefault: true });
  return useUIStore((s) => s.isShortcutHelpOpen);
}
```

- [ ] **Step 5.3: Commit**

```bash
git add apps/dispatcher/src/stores/ apps/dispatcher/src/hooks/
git commit -m "feat(dispatcher): Zustand UI store and shortcut-help hook"
```

---

## Task 6: shadcn/ui setup mínimo

**Files:**
- Create: `apps/dispatcher/components.json`
- Create: `apps/dispatcher/src/components/ui/button.tsx`
- Create: `apps/dispatcher/src/components/ui/badge.tsx`
- Create: `apps/dispatcher/src/components/ui/input.tsx`
- Create: `apps/dispatcher/src/components/ui/dialog.tsx` (re-export)
- Create: `apps/dispatcher/src/components/ui/tabs.tsx`
- Create: `apps/dispatcher/src/components/ui/tooltip.tsx`
- Create: `apps/dispatcher/src/components/ui/separator.tsx`
- Create: `apps/dispatcher/src/components/ui/scroll-area.tsx`

**Nota:** Esta tarea crea manualmente los 4 componentes que el plan usa (`button`, `badge`, `input`, `separator`). Los componentes `dialog`, `tabs`, `tooltip` y `scroll-area` se instalan en el Step 6.7 via CLI shadcn — no se usan en el código de esta tanda pero los necesita Tanda 3C. NO listados en el file map para no crear confusión.

- [ ] **Step 6.1: Crear components.json para shadcn**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 6.2: Crear Button**

`apps/dispatcher/src/components/ui/button.tsx`:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary:     'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]',
        accent:      'bg-[var(--brand-accent)] text-black hover:bg-[var(--brand-accent-hover)]',
        secondary:   'bg-[var(--neutral-100)] border border-[var(--neutral-300)] text-[var(--neutral-800)] hover:bg-[var(--neutral-50)]',
        ghost:       'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]',
        destructive: 'bg-[var(--danger)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[var(--text-sm)]',
        md: 'h-10 px-4 text-[var(--text-sm)]',
        lg: 'h-12 px-5 text-[var(--text-base)]',
        xl: 'h-14 px-6 text-[var(--text-base)]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 6.3: Crear Badge**

`apps/dispatcher/src/components/ui/badge.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  dot?: string; // CSS color string para el dot
}

export function Badge({ className, dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dot }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
```

- [ ] **Step 6.4: Crear Input**

`apps/dispatcher/src/components/ui/input.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] px-3 py-2 text-[var(--text-sm)] text-[var(--neutral-800)] placeholder:text-[var(--neutral-400)] transition-colors duration-[var(--dur-fast)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-20 focus:border-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
```

- [ ] **Step 6.5: Crear Separator**

`apps/dispatcher/src/components/ui/separator.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-[var(--neutral-200)] shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 6.6: Instalar componentes adicionales via CLI shadcn (necesarios en Tanda 3C)**

```bash
cd apps/dispatcher && pnpm dlx shadcn@latest add dialog tabs tooltip scroll-area
```

Si shadcn pregunta por sobreescribir `utils.ts`, responder **No**. Verificar que los archivos generados en `src/components/ui/` usen `cn` desde `@/lib/utils`.

- [ ] **Step 6.7: Typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```

- [ ] **Step 6.8: Commit**

```bash
git add apps/dispatcher/components.json apps/dispatcher/src/components/ui/
git commit -m "feat(dispatcher): minimal shadcn-style UI components with design tokens"
```

---

## Task 7: MapLibre + mapa oscuro

**Files:**
- Create: `apps/dispatcher/public/map-style-dark.json`

- [ ] **Step 7.1: Crear estilo MapLibre oscuro**

`apps/dispatcher/public/map-style-dark.json`:

```json
{
  "version": 8,
  "name": "Dispatch Dark",
  "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "attribution": "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors © <a href='https://carto.com/attributions'>CARTO</a>",
      "maxzoom": 19
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": { "background-color": "#0A0B0F" }
    },
    {
      "id": "osm-tiles",
      "type": "raster",
      "source": "osm",
      "minzoom": 0,
      "maxzoom": 22
    }
  ]
}
```

**Nota:** Usa tiles de CartoDB dark (gratis, sin API key). Para producción considerar MapTiler con API key propia.

- [ ] **Step 7.2: Commit**

```bash
git add apps/dispatcher/public/map-style-dark.json
git commit -m "chore(dispatcher): add dark MapLibre tile style (CartoDB, no API key needed)"
```

---

## Task 8: Layout components (sin lógica de negocio)

**Files:**
- Create: `apps/dispatcher/src/components/layout/top-bar.tsx`
- Create: `apps/dispatcher/src/components/layout/left-column.tsx`
- Create: `apps/dispatcher/src/components/layout/center-column.tsx`
- Create: `apps/dispatcher/src/components/layout/right-column.tsx`
- Create: `apps/dispatcher/src/components/layout/bottom-bar.tsx`
- Create: `apps/dispatcher/src/components/layout/app-shell.tsx`

- [ ] **Step 8.1: Crear top-bar.tsx**

`apps/dispatcher/src/components/layout/top-bar.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Search, Settings, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { DRIVER_STATUS_COLORS } from '@/lib/mock/drivers';

interface KPI {
  label: string;
  count: number;
  statusKey: keyof typeof DRIVER_STATUS_COLORS;
}

const MOCK_KPIS: KPI[] = [
  { label: 'lib', count: 12, statusKey: 'available' },
  { label: 'yendo', count: 5,  statusKey: 'en_route_to_pickup' },
  { label: 'esp', count: 3,  statusKey: 'waiting_passenger' },
  { label: 'ocup', count: 8,  statusKey: 'on_trip' },
  { label: 'off', count: 4,  statusKey: 'offline' },
];

export function TopBar() {
  const [time, setTime] = useState('');
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const { theme, setTheme, density, setDensity } = useUIStore();

  useEffect(() => {
    const tick = () => setTime(format(new Date(), 'HH:mm', { locale: es }));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="col-span-3 flex items-center gap-4 px-4 border-b border-[var(--neutral-200)] bg-[var(--neutral-50)] h-14"
      role="banner"
    >
      {/* Logo */}
      <span className="font-[var(--font-family-display)] font-bold text-[var(--text-md)] text-[var(--neutral-900)] shrink-0 tracking-tight">
        RemisDespacho
      </span>

      <div className="w-px h-5 bg-[var(--neutral-200)]" aria-hidden />

      {/* KPIs */}
      <nav aria-label="KPIs de conductores" className="flex items-center gap-2">
        {MOCK_KPIS.map((kpi) => (
          <Badge
            key={kpi.statusKey}
            dot={DRIVER_STATUS_COLORS[kpi.statusKey]}
            className="bg-[var(--neutral-100)] text-[var(--neutral-700)] font-[var(--font-family-mono)]"
            aria-label={`${kpi.count} conductores ${kpi.label}`}
          >
            {kpi.count} {kpi.label}
          </Badge>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Reloj */}
      <time
        dateTime={new Date().toISOString()}
        className="font-[var(--font-family-mono)] text-[var(--text-sm)] text-[var(--neutral-600)] tabular-nums"
        aria-label={`Hora actual: ${time}`}
      >
        {time}
      </time>

      {/* Buscador / Command palette trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={openCommandPalette}
        aria-label="Abrir búsqueda (Ctrl+K)"
        className="gap-2 text-[var(--neutral-500)]"
      >
        <Search size={16} aria-hidden />
        <kbd className="text-[var(--text-xs)] px-1 rounded bg-[var(--neutral-200)] text-[var(--neutral-600)]">
          ⌘K
        </kbd>
      </Button>

      {/* Settings */}
      <div className="relative group">
        <Button variant="ghost" size="sm" aria-label="Configuración" aria-haspopup="menu">
          <Settings size={16} aria-hidden />
        </Button>
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 hidden group-focus-within:flex flex-col min-w-40 bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] z-50 py-1"
        >
          <p className="px-3 py-1 text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest">
            Tema
          </p>
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              role="menuitem"
              onClick={() => setTheme(t)}
              className="px-3 py-1.5 text-left text-[var(--text-sm)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
            >
              {t === 'dark' ? '🌙 Oscuro' : '☀️ Claro'} {theme === t && '✓'}
            </button>
          ))}
          <div className="h-px bg-[var(--neutral-200)] my-1" />
          <p className="px-3 py-1 text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest">
            Densidad
          </p>
          {(['comfortable', 'compact', 'dense'] as const).map((d, i) => (
            <button
              key={d}
              role="menuitem"
              onClick={() => setDensity(d)}
              className="px-3 py-1.5 text-left text-[var(--text-sm)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
            >
              <kbd className="text-[var(--text-xs)] mr-1 opacity-60">⌘{i + 1}</kbd>
              {d === 'comfortable' ? 'Cómodo' : d === 'compact' ? 'Compacto' : 'Denso'}{' '}
              {density === d && '✓'}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar */}
      <Button variant="ghost" size="sm" aria-label="Perfil">
        <User size={16} aria-hidden />
      </Button>
    </header>
  );
}
```

- [ ] **Step 8.2: Crear left-column.tsx**

`apps/dispatcher/src/components/layout/left-column.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  MOCK_DRIVERS,
  DRIVER_STATUS_COLORS,
  DRIVER_STATUS_LABELS,
} from '@/lib/mock/drivers';

type Tab = 'drivers' | 'rides';

export function LeftColumn() {
  const [activeTab, setActiveTab] = useState<Tab>('drivers');

  return (
    <aside
      className="flex flex-col border-r border-[var(--neutral-200)] bg-[var(--neutral-50)] overflow-hidden"
      aria-label="Panel izquierdo"
    >
      {/* Tabs */}
      <div role="tablist" className="flex border-b border-[var(--neutral-200)]">
        {([['drivers', 'Choferes'], ['rides', 'Pedidos']] as [Tab, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2.5 text-[var(--text-sm)] font-medium transition-colors ${
                activeTab === id
                  ? 'border-b-2 border-[var(--brand-primary)] text-[var(--neutral-900)]'
                  : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* Panel: Choferes */}
      <div
        id="panel-drivers"
        role="tabpanel"
        aria-label="Lista de choferes"
        hidden={activeTab !== 'drivers'}
        className="flex-1 overflow-y-auto"
      >
        {MOCK_DRIVERS.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--neutral-500)]">
            <span className="text-3xl" aria-hidden>📡</span>
            <p className="text-[var(--text-sm)]">Sin choferes online</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--neutral-200)]">
            {MOCK_DRIVERS.map((driver) => (
              <li
                key={driver.id}
                className="flex items-center gap-3 px-3 hover:bg-[var(--neutral-100)] transition-colors cursor-pointer"
                style={{ height: 'var(--row-height)', padding: 'var(--row-padding)' }}
              >
                {/* Avatar */}
                <div
                  className="size-8 rounded-full flex items-center justify-center text-[var(--text-xs)] font-semibold bg-[var(--neutral-200)] text-[var(--neutral-700)] shrink-0"
                  aria-hidden
                >
                  {driver.avatarInitials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[var(--font-family-mono)] text-[var(--text-xs)] text-[var(--neutral-500)]">
                      {driver.internalNumber}
                    </span>
                    <span className="text-[var(--text-sm)] text-[var(--neutral-800)] truncate font-medium">
                      {driver.name}
                    </span>
                  </div>
                  <p className="text-[var(--text-xs)] text-[var(--neutral-500)]">
                    {DRIVER_STATUS_LABELS[driver.status]} desde {driver.statusSince}
                    {driver.distanceKm != null && ` · ${driver.distanceKm} km`}
                  </p>
                </div>

                {/* Status dot */}
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
                  aria-label={`Estado: ${DRIVER_STATUS_LABELS[driver.status]}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel: Pedidos (placeholder) */}
      <div
        id="panel-rides"
        role="tabpanel"
        aria-label="Pedidos activos"
        hidden={activeTab !== 'rides'}
        className="flex-1 flex items-center justify-center text-[var(--neutral-500)] text-[var(--text-sm)]"
      >
        Cola de pedidos — Tanda 3C
      </div>
    </aside>
  );
}
```

- [ ] **Step 8.3: Crear center-column.tsx**

`apps/dispatcher/src/components/layout/center-column.tsx`:

```tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { env } from '@/lib/env';
import { DRIVER_STATUS_COLORS, MOCK_DRIVERS } from '@/lib/mock/drivers';

const Map = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[var(--neutral-0)] text-[var(--neutral-500)]">
      Cargando mapa…
    </div>
  ),
});

const Marker = dynamic(() => import('react-map-gl/maplibre').then((m) => m.Marker), {
  ssr: false,
});

type View = 'map' | 'zones';

const MOCK_ZONES = [
  { id: '1', name: 'Centro',    drivers: 4, rides: 2 },
  { id: '2', name: 'Norte',     drivers: 2, rides: 1 },
  { id: '3', name: 'Sur',       drivers: 3, rides: 0 },
  { id: '4', name: 'Periferia', drivers: 1, rides: 0 },
];

// Santa Rosa, La Pampa center
const CENTER = { lng: -64.2938, lat: -36.6167 };

export function CenterColumn() {
  const [view, setView] = useState<View>('map');

  return (
    <main
      id="main-content"
      className="flex flex-col bg-[var(--neutral-0)] overflow-hidden"
      aria-label="Panel central"
    >
      {/* Toggle Mapa / Zonas */}
      <div
        role="group"
        aria-label="Vista"
        className="flex items-center gap-1 p-2 border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]"
      >
        {(['map', 'zones'] as View[]).map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-[var(--text-sm)] rounded-[var(--radius-md)] transition-colors ${
              view === v
                ? 'bg-[var(--neutral-200)] text-[var(--neutral-900)] font-medium'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
            }`}
          >
            {v === 'map' ? 'Mapa' : 'Zonas'}
          </button>
        ))}
      </div>

      {/* Map */}
      {view === 'map' && (
        <div className="flex-1 relative">
          <Map
            initialViewState={{ longitude: CENTER.lng, latitude: CENTER.lat, zoom: 13 }}
            mapStyle={env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            {MOCK_DRIVERS.filter((d) => d.distanceKm != null).map((driver) => (
              <Marker
                key={driver.id}
                longitude={CENTER.lng + driver.lngOffset}
                latitude={CENTER.lat + driver.latOffset}
                anchor="center"
              >
                <div
                  className="size-8 rounded-full border-2 border-white flex items-center justify-center text-[var(--text-xs)] font-bold text-white shadow-[var(--shadow-md)]"
                  style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
                  title={`${driver.internalNumber} — ${driver.name}`}
                >
                  {driver.internalNumber}
                </div>
              </Marker>
            ))}
          </Map>
        </div>
      )}

      {/* Zones */}
      {view === 'zones' && (
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-y-auto content-start">
          {MOCK_ZONES.map((zone) => (
            <div
              key={zone.id}
              className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-100)] p-4"
            >
              <h3 className="font-semibold text-[var(--neutral-900)] mb-2">{zone.name}</h3>
              <p className="text-[var(--text-sm)] text-[var(--neutral-600)]">
                {zone.drivers} chofer{zone.drivers !== 1 && 'es'}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--neutral-600)]">
                {zone.rides} pedido{zone.rides !== 1 && 's'}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 8.4: Crear right-column.tsx**

`apps/dispatcher/src/components/layout/right-column.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHotkeys } from 'react-hotkeys-hook';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Tab = 'new-ride' | 'queue' | 'scheduled';

const newRideSchema = z.object({
  phone:       z.string().min(7, 'Teléfono requerido'),
  passengerName: z.string().min(2, 'Nombre requerido'),
  pickup:      z.string().min(3, 'Dirección de pickup requerida'),
  destination: z.string().optional(),
  notes:       z.string().optional(),
});
type NewRideForm = z.infer<typeof newRideSchema>;

const MOCK_QUEUE = [
  { id: 'R001', passenger: 'Juan Rodríguez',  pickup: 'Av. San Martín 123',    status: 'pending' },
  { id: 'R002', passenger: 'Laura Pérez',      pickup: 'Bv. Pellegrini 456',    status: 'assigned' },
  { id: 'R003', passenger: 'Marcos González',  pickup: 'Calle Mitre 789',       status: 'pending' },
];

export function RightColumn() {
  const [activeTab, setActiveTab] = useState<Tab>('new-ride');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewRideForm>({
    resolver: zodResolver(newRideSchema),
  });

  // Hotkey: Espacio → foco en el form de nuevo pedido
  useHotkeys(
    'space',
    () => {
      setActiveTab('new-ride');
      document.getElementById('field-phone')?.focus();
    },
    { preventDefault: true, enableOnFormTags: false },
  );

  const onSubmit = (data: NewRideForm) => {
    // TODO Tanda 3C: llamar RPC assign_ride
    console.log('Nuevo pedido (mock):', data);
    reset();
  };

  return (
    <aside
      className="flex flex-col border-l border-[var(--neutral-200)] bg-[var(--neutral-50)] overflow-hidden"
      aria-label="Panel derecho"
    >
      {/* Tabs */}
      <div role="tablist" className="flex border-b border-[var(--neutral-200)]">
        {(
          [
            ['new-ride', 'Nuevo pedido'],
            ['queue', 'Cola (3)'],
            ['scheduled', 'Prog. (2)'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 text-[var(--text-xs)] font-medium transition-colors ${
              activeTab === id
                ? 'border-b-2 border-[var(--brand-primary)] text-[var(--neutral-900)]'
                : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panel: Nuevo pedido */}
      {activeTab === 'new-ride' && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
          aria-label="Formulario de nuevo pedido"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="field-phone" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Teléfono <kbd className="opacity-60">F3</kbd>
            </label>
            <Input id="field-phone" type="tel" placeholder="02954-XXXXXX" {...register('phone')} />
            {errors.phone && <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.phone.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-name" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Nombre
            </label>
            <Input id="field-name" placeholder="Nombre del pasajero" {...register('passengerName')} />
            {errors.passengerName && <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.passengerName.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-pickup" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Pickup <kbd className="opacity-60">F2</kbd>
            </label>
            <Input id="field-pickup" placeholder="Dirección de pickup" {...register('pickup')} />
            {errors.pickup && <p className="text-[var(--text-xs)] text-[var(--danger)]">{errors.pickup.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-destination" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Destino <kbd className="opacity-60">F2 ×2</kbd>
            </label>
            <Input id="field-destination" placeholder="Destino (opcional)" {...register('destination')} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="field-notes" className="text-[var(--text-xs)] font-medium text-[var(--neutral-600)]">
              Notas
            </label>
            <Input id="field-notes" placeholder="Observaciones" {...register('notes')} />
          </div>

          <div className="mt-auto">
            <Button type="submit" variant="accent" size="lg" className="w-full">
              Cargar pedido <kbd className="text-[var(--text-xs)] opacity-70">F1</kbd>
            </Button>
          </div>
        </form>
      )}

      {/* Panel: Cola */}
      {activeTab === 'queue' && (
        <ul className="flex-1 overflow-y-auto divide-y divide-[var(--neutral-200)]" aria-label="Cola de pedidos">
          {MOCK_QUEUE.map((ride) => (
            <li
              key={ride.id}
              className="p-3 hover:bg-[var(--neutral-100)] cursor-pointer"
              style={{
                borderLeft: `2px solid ${ride.status === 'pending' ? 'var(--danger)' : 'var(--info)'}`,
              }}
            >
              <p className="text-[var(--text-sm)] font-medium text-[var(--neutral-800)]">
                {ride.passenger}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--neutral-500)]">{ride.pickup}</p>
              <p className="text-[var(--text-xs)] font-[var(--font-family-mono)] text-[var(--neutral-400)]">
                {ride.id}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Panel: Programados */}
      {activeTab === 'scheduled' && (
        <div className="flex-1 flex items-center justify-center text-[var(--neutral-500)] text-[var(--text-sm)]">
          Programados — Tanda 3C
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 8.5: Crear bottom-bar.tsx**

`apps/dispatcher/src/components/layout/bottom-bar.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, MessageSquare, Bell, Clock, Wifi, WifiOff } from 'lucide-react';
import { subscribeToConnectionStatus } from '@/lib/supabase/realtime';
import { useUIStore } from '@/stores/ui-store';
import { useShortcutHelp } from '@/hooks/use-shortcut-help';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; Icon: typeof Wifi }> = {
  connected:    { color: 'var(--success)', label: 'Conectado',    Icon: Wifi },
  connecting:   { color: 'var(--warning)', label: 'Conectando…',  Icon: Wifi },
  disconnected: { color: 'var(--danger)',  label: 'Desconectado', Icon: WifiOff },
};

// Tipado explícito evita que noUncheckedIndexedAccess infiera string | undefined al destructurar
const SHORTCUTS_TABLE: [string, string][] = [
  ['Espacio',   'Nuevo pedido'],
  ['F1',        'Guardar'],
  ['F2',        'Pickup (×2 → destino)'],
  ['F3',        'Teléfono'],
  ['A',         'Asignar'],
  ['M',         'Designar chofer'],
  ['E',         'Editar'],
  ['C',         'Cancelar'],
  ['H',         'Hold'],
  ['R',         'Reasignar'],
  ['S',         'Buscar global'],
  ['F9',        'Mensaje al chofer'],
  ['Tab',       'Ciclar paneles'],
  ['Esc',       'Cerrar'],
  ['Ctrl+Z',    'Deshacer asignación (30s)'],
  ['⌘K',        'Paleta de comandos'],
  ['⌘1/2/3',    'Densidad'],
  ['?',         'Esta ayuda'],
];

export function BottomBar() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const isHelpOpen = useShortcutHelp();
  const toggleHelp = useUIStore((s) => s.toggleShortcutHelp);

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus(setStatus);
    return unsubscribe;
  }, []);

  const { color, label, Icon } = STATUS_CONFIG[status];

  return (
    <>
      <footer
        className="col-span-3 flex items-center gap-4 px-4 border-t border-[var(--neutral-200)] bg-[var(--neutral-50)]"
        style={{ height: '44px' }}
        role="contentinfo"
      >
        {/* Mensajes */}
        <button className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors" aria-label="Mensajes con choferes">
          <MessageSquare size={14} aria-hidden />
          Mensajes
        </button>

        {/* Alertas */}
        <button className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors" aria-label="Alertas activas">
          <Bell size={14} aria-hidden />
          Alertas
        </button>

        {/* Próximos programados */}
        <button className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors" aria-label="Próximos programados">
          <Clock size={14} aria-hidden />
          Próximos 30 min
        </button>

        <div className="flex-1" />

        {/* Ayuda de shortcuts */}
        <button
          onClick={toggleHelp}
          aria-label="Atajos de teclado (?)"
          aria-expanded={isHelpOpen}
          className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
        >
          <HelpCircle size={14} aria-hidden />
          <kbd>?</kbd>
        </button>

        {/* Realtime status */}
        <div
          className="flex items-center gap-1.5 text-[var(--text-xs)]"
          style={{ color }}
          aria-live="polite"
          aria-label={`Estado de conexión: ${label}`}
        >
          <Icon size={14} aria-hidden />
          {label}
        </div>
      </footer>

      {/* Shortcuts modal */}
      {isHelpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Atajos de teclado"
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) toggleHelp(); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--neutral-200)]">
              <h2 className="font-semibold text-[var(--neutral-900)]">Atajos de teclado</h2>
              <button
                onClick={toggleHelp}
                aria-label="Cerrar"
                className="text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <table className="w-full text-[var(--text-sm)]">
                <tbody>
                  {SHORTCUTS_TABLE.map(([key, desc]) => (
                    <tr key={key} className="border-b border-[var(--neutral-200)] last:border-0">
                      <td className="py-2 pr-4">
                        <kbd className="font-[var(--font-family-mono)] text-[var(--text-xs)] bg-[var(--neutral-200)] px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--neutral-700)]">
                          {key}
                        </kbd>
                      </td>
                      <td className="py-2 text-[var(--neutral-600)]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 8.6: Crear app-shell.tsx**

`apps/dispatcher/src/components/layout/app-shell.tsx`:

```tsx
import { TopBar }       from './top-bar';
import { LeftColumn }   from './left-column';
import { CenterColumn } from './center-column';
import { RightColumn }  from './right-column';
import { BottomBar }    from './bottom-bar';

export function AppShell({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateColumns: '280px 1fr 360px',
        gridTemplateRows: '56px 1fr 44px',
      }}
    >
      <TopBar />
      <LeftColumn />
      <CenterColumn />
      <RightColumn />
      <BottomBar />
      {children}
    </div>
  );
}
```

- [ ] **Step 8.7: Typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```
Expected: sin errores de tipos. Si hay errores de `maplibre-gl` (tipos), agregar a tsconfig `"types": ["maplibre-gl"]`.

- [ ] **Step 8.8: Commit**

```bash
git add apps/dispatcher/src/components/
git commit -m "feat(dispatcher): 3-column app shell with TopBar, columns, BottomBar, shortcuts modal"
```

---

## Task 9: Command palette

**Files:**
- Create: `apps/dispatcher/src/components/command-palette.tsx`

- [ ] **Step 9.1: Crear command-palette.tsx**

`apps/dispatcher/src/components/command-palette.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Plus, Users, List, BarChart2, Settings, LogOut } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useHotkeys } from 'react-hotkeys-hook';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const close  = useUIStore((s) => s.closeCommandPalette);
  const open   = useUIStore((s) => s.openCommandPalette);
  const setDensity = useUIStore((s) => s.setDensity);

  useHotkeys('mod+k', (e) => { e.preventDefault(); isOpen ? close() : open(); });

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [close]);

  const handleSignOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = '/login';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-xl mx-4">
        <Command
          className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden"
          label="Paleta de comandos"
        >
          <div className="flex items-center gap-2 px-4 border-b border-[var(--neutral-200)]">
            <Search size={16} className="text-[var(--neutral-500)]" aria-hidden />
            <Command.Input
              placeholder="Buscar acción o pedido…"
              className="flex-1 h-12 bg-transparent text-[var(--neutral-800)] placeholder:text-[var(--neutral-400)] text-[var(--text-sm)] focus:outline-none"
              autoFocus
            />
            <kbd className="text-[var(--text-xs)] text-[var(--neutral-500)] border border-[var(--neutral-300)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
              Esc
            </kbd>
          </div>

          <Command.List className="overflow-y-auto max-h-[360px] p-2">
            <Command.Empty className="py-6 text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
              Sin resultados
            </Command.Empty>

            <Command.Group heading="Acciones" className="text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest px-2 py-1">
              <CommandItem icon={Plus}     label="Nuevo pedido"     shortcut="Espacio"  onSelect={() => { document.getElementById('field-phone')?.focus(); close(); }} />
              <CommandItem icon={Users}    label="Asignar chofer"   shortcut="A"        onSelect={close} />
              <CommandItem icon={List}     label="Buscar pasajero"  shortcut="S"        onSelect={close} />
              <CommandItem icon={Search}   label="Buscar viaje #"   shortcut=""         onSelect={close} />
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--neutral-200)] my-1" />

            <Command.Group heading="Densidad" className="text-[var(--text-xs)] text-[var(--neutral-500)] uppercase tracking-widest px-2 py-1">
              {(['comfortable', 'compact', 'dense'] as const).map((d, i) => (
                <Command.Item
                  key={d}
                  value={d}
                  onSelect={() => { setDensity(d); close(); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] text-[var(--neutral-700)] cursor-pointer data-[selected=true]:bg-[var(--neutral-200)]"
                >
                  <BarChart2 size={16} className="text-[var(--neutral-500)]" aria-hidden />
                  <span className="flex-1">{d === 'comfortable' ? 'Cómodo' : d === 'compact' ? 'Compacto' : 'Denso'}</span>
                  <kbd className="text-[var(--text-xs)] opacity-60">⌘{i + 1}</kbd>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--neutral-200)] my-1" />

            <Command.Group heading="Sesión">
              <CommandItem icon={Settings} label="Configuración" shortcut="" onSelect={close} />
              <CommandItem icon={LogOut}   label="Cerrar sesión" shortcut="" onSelect={handleSignOut} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  shortcut: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] text-[var(--neutral-700)] cursor-pointer data-[selected=true]:bg-[var(--neutral-200)]"
    >
      <Icon size={16} className="text-[var(--neutral-500)]" aria-hidden />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[var(--text-xs)] opacity-60">{shortcut}</kbd>
      )}
    </Command.Item>
  );
}
```

- [ ] **Step 9.2: Typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```

- [ ] **Step 9.3: Commit**

```bash
git add apps/dispatcher/src/components/command-palette.tsx
git commit -m "feat(dispatcher): command palette (Cmd+K) with cmdk"
```

---

## Task 10: Hotkeys globales de densidad (Cmd+1/2/3)

**Files:**
- Create: `apps/dispatcher/src/components/layout/density-hotkeys.tsx`

- [ ] **Step 10.1: Crear density-hotkeys.tsx**

```tsx
// apps/dispatcher/src/components/layout/density-hotkeys.tsx
'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useUIStore } from '@/stores/ui-store';

export function DensityHotkeys() {
  const setDensity = useUIStore((s) => s.setDensity);
  useHotkeys('mod+1', () => setDensity('comfortable'), { preventDefault: true });
  useHotkeys('mod+2', () => setDensity('compact'),     { preventDefault: true });
  useHotkeys('mod+3', () => setDensity('dense'),       { preventDefault: true });
  return null;
}
```

- [ ] **Step 10.2: Commit**

```bash
git add apps/dispatcher/src/components/layout/density-hotkeys.tsx
git commit -m "feat(dispatcher): Cmd+1/2/3 density hotkeys"
```

---

## Task 11: Auth pages + dashboard layout

**Files:**
- Create: `apps/dispatcher/src/app/(auth)/login/page.tsx`
- Create: `apps/dispatcher/src/app/(auth)/layout.tsx`
- Create: `apps/dispatcher/src/app/(dashboard)/layout.tsx`
- Create: `apps/dispatcher/src/app/(dashboard)/page.tsx`
- Create: `apps/dispatcher/src/app/(dashboard)/rides/page.tsx`
- Create: `apps/dispatcher/src/app/(dashboard)/drivers/page.tsx`
- Create: `apps/dispatcher/src/app/(dashboard)/reports/page.tsx`

- [ ] **Step 11.1: Crear (auth)/layout.tsx**

```tsx
// apps/dispatcher/src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-0)]">
      {children}
    </div>
  );
}
```

- [ ] **Step 11.2: Crear login/page.tsx**

```tsx
// apps/dispatcher/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) throw signInError;

      // Verificar rol
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!profile || !['dispatcher', 'admin'].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error('No tenés permisos para acceder al panel de despacho.');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión. Verificá tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-family-display)] font-bold text-[var(--text-2xl)] text-[var(--neutral-900)] tracking-tight">
            RemisDespacho
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--neutral-500)] mt-1">
            Panel de despacho
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-[var(--text-sm)] font-medium text-[var(--neutral-700)]">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-[var(--text-sm)] font-medium text-[var(--neutral-700)]">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-[var(--text-sm)] text-[var(--danger)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? 'Ingresando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center mt-4">
          <a href="#" className="text-[var(--text-sm)] text-[var(--neutral-500)] hover:text-[var(--brand-primary)] transition-colors">
            ¿Olvidaste tu contraseña?
          </a>
        </p>
      </div>

      {/* Versión */}
      <p className="text-center text-[var(--text-xs)] text-[var(--neutral-500)] mt-4">
        v0.1.0
      </p>
    </div>
  );
}
```

- [ ] **Step 11.3: Crear (dashboard)/layout.tsx**

```tsx
// apps/dispatcher/src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { CommandPalette } from '@/components/command-palette';
import { DensityHotkeys } from '@/components/layout/density-hotkeys';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['dispatcher', 'admin'].includes(profile.role)) {
    redirect('/login');
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <CommandPalette />
      <DensityHotkeys />
    </>
  );
}
```

- [ ] **Step 11.4: Crear páginas placeholder del dashboard**

`apps/dispatcher/src/app/(dashboard)/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function DashboardPage() {
  redirect('/rides');
}
```

`apps/dispatcher/src/app/(dashboard)/rides/page.tsx`:
```tsx
export default function RidesPage() {
  return null; // contenido real en Tanda 3C
}
```

`apps/dispatcher/src/app/(dashboard)/drivers/page.tsx`:
```tsx
export default function DriversPage() {
  return (
    <div className="p-8 text-[var(--neutral-500)]">Gestión de choferes — Tanda 3C</div>
  );
}
```

`apps/dispatcher/src/app/(dashboard)/reports/page.tsx`:
```tsx
export default function ReportsPage() {
  return (
    <div className="p-8 text-[var(--neutral-500)]">Reportes — Tanda 5</div>
  );
}
```

- [ ] **Step 11.5: Typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```
Expected: sin errores.

- [ ] **Step 11.6: Commit**

```bash
git add apps/dispatcher/src/app/
git commit -m "feat(dispatcher): auth login page and dashboard layout with server-side guard"
```

---

## Task 12: Middleware de Supabase SSR (CRÍTICO — sin esto el auth guard falla en producción)

**Files:**
- Create: `apps/dispatcher/src/middleware.ts`

**Por qué:** `@supabase/ssr` requiere un middleware Next.js que refresque el access token en cada request. Sin él, `getUser()` en Server Components devuelve `null` para sesiones válidas una vez que el token expira (~1h), haciendo que el guard redirija a /login aunque el usuario esté logueado.

- [ ] **Step 12.1: Crear middleware.ts**

```ts
// apps/dispatcher/src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresca session — efecto secundario: setea cookies de sesión actualizadas
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Excluir archivos estáticos, imágenes y el health endpoint
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
```

- [ ] **Step 12.2: Typecheck**

```bash
cd apps/dispatcher && pnpm typecheck
```

- [ ] **Step 12.3: Commit**

```bash
git add apps/dispatcher/src/middleware.ts
git commit -m "feat(dispatcher): Supabase SSR middleware for session cookie refresh"
```

---

## Task 13: Health endpoint  <!-- era Task 12 antes del middleware -->

**Files:**
- Create: `apps/dispatcher/src/app/api/health/route.ts`

- [ ] **Step 12.1: Crear health route**

```ts
// apps/dispatcher/src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    // ping mínimo: contar profiles (tabla siempre existe)
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    if (error) throw error;

    return NextResponse.json({ status: 'ok', supabase: 'ok', ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: 'error', supabase: 'unreachable', error: String(e) },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 12.2: Commit**

```bash
git add apps/dispatcher/src/app/api/
git commit -m "feat(dispatcher): /api/health endpoint with Supabase ping"
```

---

## Task 14: Smoke test y verificación final

- [ ] **Step 13.1: Typecheck completo**

```bash
cd apps/dispatcher && pnpm typecheck
```
Expected: 0 errores, 0 warnings críticos.

- [ ] **Step 13.2: Lint**

```bash
cd apps/dispatcher && pnpm lint
```
Expected: sin errores de lint.

- [ ] **Step 13.3: Verificar que el dev server levanta**

```bash
cd apps/dispatcher && pnpm dev
```
Expected: 
```
▲ Next.js 15.x
- Local: http://localhost:3001
✓ Ready in Xs
```

- [ ] **Step 13.4: Verificar acceptance criteria manualmente**

Abrir http://localhost:3001 en el browser y verificar:
- [ ] `/login` muestra el formulario centrado, tema oscuro.
- [ ] Login con credencial de Supabase local funciona y redirige al dashboard.
- [ ] Layout 3 columnas + topbar + bottombar visible con datos mock.
- [ ] KPIs visibles en TopBar con dots de color.
- [ ] Lista de 8 choferes mock en LeftColumn.
- [ ] Mapa MapLibre renderiza con tiles oscuros.
- [ ] `Cmd/Ctrl+K` abre command palette.
- [ ] `Cmd/Ctrl+1/2/3` cambia densidad (visible en row heights).
- [ ] `?` abre modal de shortcuts.
- [ ] Dark default; toggle a light en Settings funciona.
- [ ] Indicador Realtime en BottomBar muestra estado de conexión.
- [ ] `/api/health` devuelve `{"status":"ok"}`.

- [ ] **Step 13.5: Commit final**

```bash
git add -A
git commit -m "feat(dispatcher): bootable shell with auth and 3-column layout

- Login page con guard de rol (dispatcher/admin only)
- AppShell 3 cols: LeftColumn (choferes mock), CenterColumn (mapa MapLibre dark), RightColumn (form nuevo pedido)
- TopBar con KPIs, reloj, command palette trigger, density/theme toggle
- BottomBar con estado Realtime, modal de shortcuts completo
- Cmd+K command palette (cmdk), Cmd+1/2/3 density hotkeys
- CSS tokens inlineados (migrar a @remis/design-system en Tanda 1B)
- Health endpoint /api/health"
```

---

## Notas de implementación

### Si `profiles` table no existe en Supabase local
El guard del dashboard y el health endpoint van a fallar. Opciones:
1. Levantar Supabase local con `supabase start` desde la raíz — las migrations de Tanda 1A ya tienen la tabla `profiles`.
2. Para testing puro del skeleton sin DB: comentar temporalmente el guard en `(dashboard)/layout.tsx` y reemplazar con `return <AppShell>{children}</AppShell>`.

### MapLibre tiles
El estilo usa CartoDB tiles (sin API key, gratis). Si los tiles no cargan por CORS, usar MapTiler con API key gratuita. Actualizar `NEXT_PUBLIC_MAPLIBRE_STYLE_URL` o modificar `map-style-dark.json`.

### Migración a `@remis/design-system`
Cuando Tanda 1B esté completa, reemplazar el bloque de tokens en `globals.css` por:
```css
@import "@remis/design-system/css/tokens.css";
```
Y agregar `@remis/design-system` como dependency en `package.json`.
