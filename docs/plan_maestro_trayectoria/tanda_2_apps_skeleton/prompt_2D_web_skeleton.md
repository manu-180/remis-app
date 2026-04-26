# Prompt 2D — Web (landing + admin): skeleton Next.js 15

> **LEÉ:** `00_design_language.md` (sec 9 landing, 11 voz), `docs/brand/social_landing_brief.md` (Tanda 1D), `00_arquitectura.md`, `00_file_ownership_matrix.md`.

## Objetivo

Sitio público con landing premium + sub-app admin (para el dueño de la agencia, NO para el despachante). Al final de la tanda: landing `[/]` con hero + 3 secciones placeholder, admin `[/admin]` protegida con login + dashboard stub.

## File ownership

✍️ `apps/web/**`. NADA fuera.

## Steps

### 1. Bootstrap

```bash
cd apps && pnpm create next-app@latest web --ts --tailwind --app --src-dir --use-pnpm
```

Mismo stack que dispatcher. Deps adicionales:
- `framer-motion` (animaciones del landing premium)
- `next-sitemap`
- `@vercel/analytics` (placeholder)

### 2. Estructura

```
apps/web/src/
├── app/
│   ├── layout.tsx                  # html base (light default acá)
│   ├── (marketing)/
│   │   ├── layout.tsx              # nav + footer públicos
│   │   ├── page.tsx                # /
│   │   ├── tarifas/page.tsx
│   │   ├── conductores/page.tsx
│   │   ├── faq/page.tsx
│   │   └── contacto/page.tsx
│   ├── legal/
│   │   ├── terminos/page.tsx       # carga desde docs/legal/terms.md
│   │   ├── privacidad/page.tsx
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── layout.tsx              # protected, sidebar admin
│   │   ├── page.tsx                # dashboard stub
│   │   ├── flota/page.tsx          # placeholder
│   │   ├── conductores/page.tsx    # placeholder
│   │   ├── tarifas/page.tsx        # placeholder
│   │   └── reportes/page.tsx       # placeholder
│   └── api/health/route.ts
├── components/
│   ├── ui/                         # shadcn modificado
│   ├── marketing/
│   │   ├── hero.tsx
│   │   ├── how-it-works.tsx
│   │   ├── pricing-preview.tsx
│   │   ├── drivers-cta.tsx
│   │   ├── faq-section.tsx
│   │   ├── footer.tsx
│   │   └── nav.tsx
│   └── admin/
│       └── sidebar.tsx
├── lib/{supabase, env, utils, mdx}/
└── content/                        # MDX sources si decidís cargar legal así
```

### 3. Landing premium — Hero

**Crítico**: este es el primer contacto con el cliente. Tiene que verse premium, regional, sobrio.

```tsx
<section className="relative min-h-[80vh] overflow-hidden bg-neutral-0">
  {/* Background: foto del pueblo / horizonte pampeano en horario dorado */}
  <div className="absolute inset-0 -z-10">
    <Image src="/hero-pampa.webp" alt="" fill className="object-cover" priority />
    <div className="absolute inset-0 bg-gradient-to-b from-neutral-0/60 via-neutral-0/40 to-neutral-0" />
  </div>

  <div className="container mx-auto px-6 pt-32 pb-20">
    <h1 className="font-display text-5xl font-bold tracking-tight text-neutral-900 md:text-6xl">
      Tu remís en [PUEBLO],<br />a un toque.
    </h1>
    <p className="mt-6 max-w-xl text-lg text-neutral-600">
      Pedí remís desde la app o llamando a la agencia. Conductores conocidos, tarifas de ordenanza, sin sorpresas.
    </p>
    <div className="mt-10 flex flex-wrap gap-4">
      <Button size="xl" variant="primary" asChild>
        <Link href="#descargar">Descargá la app</Link>
      </Button>
      <Button size="xl" variant="secondary" asChild>
        <Link href="tel:+5402954XXXXXX">Llamar a la agencia</Link>
      </Button>
    </div>
  </div>
</section>
```

**Detalles premium:**
- La imagen hero es **placeholder hasta Tanda 4** (foto custom encargada al cliente). Mientras tanto: gradiente sólido `--brand-primary` → `--brand-accent` con SVG abstracto de horizonte minimalista superpuesto.
- Animación entrada: `framer-motion` fade + 12px Y translation, stagger 80ms entre h1 / p / botones, ease `--ease-out`.
- `prefers-reduced-motion` respetado.
- CTA tel: con número placeholder y `noreferrer`.

### 4. Cómo funciona — 3 pasos

Sección `how-it-works.tsx`:
```
[1] Pedí       [2] Te buscamos       [3] Llegás
ícono custom   ícono custom          ícono custom
```

3 cards con border-top de `--brand-accent`, ícono custom 40px (placeholder Lucide hasta que Tanda 1D entregue set custom), título 20px, body 16px.

### 5. Tarifas preview

Card horizontal con tabla de zonas (matriz simplificada). Disclaimer "Tarifas según ordenanza municipal vigente". Link "Ver tarifas completas" → `/tarifas`.

`/tarifas` página completa: matriz visual de zonas + mapa interactivo opcional con regiones.

### 6. Para conductores CTA

Sección con foto/ilustración + copy "¿Querés ser conductor de [NOMBRE]?" + CTA "Postulate". Form simple: nombre, teléfono, mensaje. Server Action que mete a tabla `driver_applications` (placeholder — crear migración mínima en Tanda 3D si no se hizo en 1A).

### 7. FAQ

8 preguntas placeholder de `social_landing_brief.md`. Accordion con shadcn. Schema.org FAQPage JSON-LD para SEO.

### 8. Footer

```
[NOMBRE]                        Servicio
sobrio                          Tarifas
                                Cómo funciona
Contacto                        Conductores
[dirección]                     FAQ
[teléfono]
[email]                         Legal
                                Términos
[redes placeholder]             Privacidad
                                Datos del responsable

© 2026 [Razón social]. CUIT XX-XXXXXXXX-X. Habilitación municipal N° XXX.
```

### 9. Nav

Top sticky, transparent en hero, sólido al scroll. Items: Inicio, Cómo funciona, Tarifas, Conductores, Contacto. CTA "Descargar app" siempre visible.

Mobile: hamburguer → sheet bottom-up con la lista vertical + CTA grande.

### 10. SEO & meta

- `metadata` en cada page.
- `app/sitemap.ts` con next-sitemap.
- `app/robots.ts`.
- OG image custom (placeholder, gradient + texto).
- `lang="es-AR"`.

### 11. Admin sub-app

#### `/admin/login`

Login email + password. Solo role `admin` (NO dispatcher).

#### `/admin/layout.tsx`

Sidebar fija (w240) + content. Sidebar items:
- Resumen (dashboard)
- Flota (vehículos)
- Conductores
- Pasajeros (con buscador + blacklist)
- Tarifas (CRUD de fares y zonas)
- Reportes (placeholder)
- Configuración

Top bar mínima: nombre del agente + dropdown logout.

**Nota:** este admin NO duplica el dispatcher. Es para el dueño que entra ocasionalmente a actualizar tarifas, dar de alta un conductor nuevo, ver reportes mensuales.

#### `/admin` dashboard stub

Cards con KPIs mock:
- Viajes hoy / esta semana / este mes
- Ingresos
- Choferes activos
- Top 5 conductores del mes
- Anomalías (placeholder)

### 12. Legal pages

Renderizan los `.md` de `docs/legal/` (Tanda 1C). Soluciones:
- Opción A: copiar los MD a `apps/web/src/content/` y renderizar con `next-mdx-remote`.
- Opción B: importar directo desde `docs/legal/` con un loader (mejor para no duplicar).

Recomendado B con un script que valida en build time que el archivo existe. Layout legal: max-width 720, tipografía body 16px, jerarquía de headings clara.

### 13. Theme

Landing default **light** (más cálido para marketing). Admin default **dark** (consistente con dispatcher). Toggle disponible en ambos.

### 14. Performance budgets

- LCP < 1.8s.
- CLS < 0.1.
- INP < 200ms.
- Bundle inicial < 100kB gzipped.

`next/image` para todas las imágenes. Fonts con `display: swap`. CSS crítico inlined.

## Acceptance criteria

- [ ] `pnpm dev` levanta web en :3000.
- [ ] Landing renderiza Hero + 4 secciones + footer.
- [ ] `/legal/terminos` y `/legal/privacidad` cargan desde docs/legal/.
- [ ] `/admin/login` protege `/admin` correctamente.
- [ ] `/admin` muestra dashboard stub.
- [ ] Lighthouse ≥ 90 en performance/SEO/accessibility.
- [ ] Modo dark + light funcionan.
- [ ] `pnpm typecheck` clean.
- [ ] Commit `feat(web): bootable landing + admin skeleton`.

## Out of scope

- Form de aplicación a conductor con backend completo (Tanda 3D).
- CRUD admin real (Tanda 5).
- SEO técnico avanzado (sitemap dinámico, schema completo) — solo lo básico.

## Notas

- **No copiar templates de SaaS startup**. Esto es un negocio local. Foto del pueblo > vector abstracto. Voz directa > marketing speak.
- **Si tenés que poner un emoji en el footer redes — no lo hagas**. Íconos Lucide.
- **Imagen hero placeholder:** mientras no haya foto real, gradiente + SVG horizontal pampeano (un dibujo simple de horizonte con árbol caldén estilizado). Que NO sea genérico.
