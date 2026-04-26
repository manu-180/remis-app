# Plan Maestro de Trayectoria — App de Remisería

**Stack fijo (no negociable):** Flutter + Riverpod (driver/passenger), Next.js 15 App Router (dispatcher panel + landing/admin), Supabase (Postgres + PostGIS + Auth + Realtime + Storage + Edge Functions), Google Maps, FCM, MercadoPago Checkout Pro.

**Contexto del producto:** App single-tenant para una remisería de pueblo cercano a Santa Rosa, La Pampa (área 2954). ~50 conductores, asignación manual por despachante 8h/día, sin tarifa dinámica, regulada por ordenanza municipal (NO Uber-clone).

---

## Cómo usar este plan

1. **Cada tanda corre en paralelo** entre sus prompts (varias sesiones de Sonnet simultáneas).
2. **Las tandas son secuenciales**: terminar Tanda N antes de arrancar N+1.
3. **Antes de arrancar cualquier sesión** el agente debe leer:
   - `00_design_language.md` (biblia visual)
   - `00_arquitectura.md` (decisiones técnicas)
   - `00_file_ownership_matrix.md` (qué archivos puede tocar)
   - El `README.md` de la tanda
   - Su prompt específico (`prompt_XY_*.md`)

4. **Regla de oro de paralelización:** dos prompts dentro de la misma tanda **nunca** comparten archivos en escritura. Si un agente necesita un archivo de otro, lee su contrato (interfaz/tipos) que ya quedó congelado en una tanda anterior.

---

## Mapa de tandas

| Tanda | Nombre | # Prompts paralelos | Salida principal |
|-------|--------|---------------------|------------------|
| 0 | Fundación monorepo | 1 (secuencial) | Estructura raíz, tooling, configs compartidos |
| 1 | Backend + Design System | 4 | Schema Supabase, design tokens, brand kit, compliance docs |
| 2 | Skeletons de apps | 4 | Driver app, Passenger app, Dispatcher, Landing+Admin (cada uno booteable en vacío) |
| 3 | Core features | 4 | GPS background, request ride, asignación manual, edge functions |
| 4 | Premium polish | 4 | Animaciones, micro-interacciones, shortcuts, MP end-to-end |
| 5 | Producción | 4 | Observability, CI/CD, testing, KYC + seguridad |

**Total: 1 + 4×5 = 21 prompts en 6 tandas.** Si todas las tandas paralelas se ejecutan al máximo en paralelo: 6 sesiones secuenciales de duración variable.

---

## Convenciones globales

- **Idioma del código:** inglés (variables, funciones, tipos, comentarios técnicos).
- **Idioma de UI:** español rioplatense, voseo (`querés`, `tu viaje está en camino`).
- **Idioma de docs/comentarios de negocio:** español.
- **Commits:** Conventional Commits en inglés (`feat:`, `fix:`, `chore:`).
- **Branches:** `tanda-N/<scope>` (ej. `tanda-2/driver-skeleton`).
- **Package manager Next.js:** `pnpm` (turbo-friendly).
- **Flutter SDK:** estable más reciente (≥3.27 al 2026-04).
- **Dart formatting:** 100 cols, `dart format`.
- **TS:** strict, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.

---

## Premisa de diseño (resumen — ver `00_design_language.md` para detalle)

> **"Premium pampeano":** sobrio, confiable, denso de información sin sentirse cargado. Inspiración cruzada entre Cabify (calidez tipográfica), Linear (densidad y modo oscuro), Stripe Dashboard (jerarquía de información), y un guiño regional al cuero/madera/cielo de pampa al atardecer.

**Tres no-negociables visuales:**
1. **Modo oscuro por default** en dispatcher (8h frente a la pantalla → no quemar retina).
2. **Tipografía variable** con escala modular `1.25` (Major Third). Inter Tight como display, Inter como body.
3. **Cero stock photos**. Iconografía custom (Lucide como base + 6-8 íconos a medida del rubro: remís, pickup pin, paradero, móvil interno, etc.).

---

## Estado de progreso

Marcar cada prompt como `[ ]` pendiente, `[~]` en curso, `[x]` completo. Al cerrar una tanda, hacer commit con tag `tanda-N-done`.

- [ ] Tanda 0 — Fundación
- [ ] Tanda 1 — Backend + Design System
- [ ] Tanda 2 — Skeletons
- [ ] Tanda 3 — Core features
- [ ] Tanda 4 — Premium polish
- [ ] Tanda 5 — Producción

---

## Referencias clave

- Informe técnico inicial (6 ejes): los hallazgos que justifican cada decisión están embebidos en `00_arquitectura.md`.
- [Supabase Realtime docs](https://supabase.com/docs/guides/realtime)
- [PostGIS geography type](https://postgis.net/workshops/postgis-intro/geography.html)
- [flutter_background_geolocation](https://github.com/transistorsoft/flutter_background_geolocation)
- [MercadoPago Checkout Pro AR](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro)
