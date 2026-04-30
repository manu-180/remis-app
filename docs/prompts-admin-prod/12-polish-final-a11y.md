# Prompt 12 — Polish final: a11y, microcopy, consistencia

## Objetivo

Cierre fino para que el admin se sienta "premium completo":
- Accesibilidad pasa axe-core sin críticos.
- Confirms consistentes en acciones destructivas.
- Microcopy en español rioplatense pulido.
- Botón refund con dialog de warning real (no es refund de verdad).
- KYC fotos placeholders mejorados.
- Inconsistencias menores fixed.

**Tiempo estimado:** 2 horas.

## Contexto del proyecto

Mismo que prompts anteriores. Después de los 12 prompts anteriores, ya está casi todo. Este es el "fix the polish" final.

## Tareas concretas

### 1. axe-core audit

Instalar y correr axe-core sobre las páginas principales:

```bash
pnpm add -D @axe-core/playwright
```

Crear `apps/dispatcher/tests/e2e/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/admin',
  '/admin/drivers',
  '/admin/drivers/aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
  '/admin/rides',
  '/admin/sos',
  '/admin/zones',
  '/admin/fares',
  '/admin/passengers',
  '/admin/payments',
  '/admin/kyc',
  '/admin/audit',
  '/admin/team',
  '/admin/settings',
];

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
}
```

Resolver los issues que aparezcan. Comunes:
- `aria-label` faltante en buttons-only-icon.
- `<input>` sin `<label>` asociado.
- Color contrast bajo.
- Focus no visible en algunos elementos custom.
- `<button>` con role inadecuado.
- Listas con `<div>` en vez de `<ul>/<li>`.

Foco en críticos. Los moderados son opcionales para el demo.

### 2. Confirms consistentes en destructivas

`useConfirm()` está en parte del código (drivers detail, passengers, zones) pero NO en otras (drivers-list "Suspender", payments "Reembolsar", settings password después de prompt 05 ya está).

Auditar:

```bash
rg "\.delete\\(\\)|\\.update\\(.*status.*suspended|\\.update\\(.*deleted_at" apps/dispatcher/src/components/admin/
```

Para cada acción destructiva sin confirm:
- Importar `useConfirm` (o usar el componente `<ConfirmDialog />`).
- Mostrar dialog con título + descripción + botón rojo + cancelar.
- Acción destructiva = soft delete o status change que cambia comportamiento.

Casos pendientes:
- `drivers-list-client.tsx:204-217` — "Suspender" sin confirm.
- `payments-client.tsx:347-362` — "Reembolsar" sin confirm.
- Cualquier otra que aparezca en la búsqueda.

Texto del confirm consistente:
- Título: "¿Confirmar [acción]?"
- Descripción: explica qué pasa después.
- Botón primario: imperativo claro ("Suspender", "Reembolsar", "Eliminar").
- Cancelar siempre como secondary.

### 3. Refund con warning sobre simulación

`payments-client.tsx`

Agregar al confirm dialog del refund:

```
⚠️ Aviso

El reembolso solo cambia el estado del pago en la base de datos.
NO se ejecuta una devolución real en MercadoPago. Para reembolsar
de verdad, hacelo manualmente desde tu panel de MP.

¿Marcar este pago como reembolsado en el sistema?
[Cancelar] [Sí, marcar como reembolsado]
```

Esto evita que el cliente piense que está reembolsando plata cuando en realidad solo es un toggle.

### 4. KYC fotos placeholders mejor

`apps/dispatcher/src/components/admin/kyc/kyc-client.tsx:211-228`

Hoy: cuadros grises con texto "Foto documento" / "Foto selfie". Se ve a kilómetros que es demo.

Si la KYC del seed no tiene fotos reales (lo cual es esperable porque es demo), reemplazar por:

```
┌───────────────────────────────┐
│   [icono camera muted]         │
│                                │
│   No hay foto disponible       │
│   El proveedor (didit /        │
│   AWS Rekognition) no provee   │
│   imágenes en este registro    │
└───────────────────────────────┘
```

Mensaje pulido. O si las fotos deberían existir y simplemente no estaban en el seed, agregar un fallback más elegante.

### 5. Microcopy review

Revisar todos los textos visibles del admin para uniformidad:
- Español rioplatense (vos, no tú).
- Sin tecnicismos innecesarios ("UUID" → "ID", "filtrar por" en vez de "where").
- Mensajes de empty state explicativos, no genéricos. Ej: en vez de "No hay datos", "Aún no hay viajes registrados. Cuando un pasajero pida un remis, va a aparecer acá."
- Toasts de éxito específicos. Ej: en vez de "Guardado", "Cambios guardados en la zona [Centro]".
- Errores actionables. En vez de "Error", "No pudimos guardar. Reintentá en unos segundos."

Buscar textos sospechosos:

```bash
rg -i "datos|error|guardado|enviado" --type ts --type tsx apps/dispatcher/src/components/
```

Y revisar uno por uno los que se renderizan al usuario.

### 6. Estados clickeables que no se notan

Auditar elementos que SON clickeables pero el cursor / hover no lo deja claro:

- Filas de tablas que navegan al detail → `cursor: pointer; transition: background 120ms`.
- Cards de KPI que linkean a su detail (si aplica).
- Iconos clickeables en headers / acciones rápidas → mínimo `cursor: pointer; opacity transition`.

### 7. Focus rings auditados

Tailwind v4 tokens en `globals.css` ya tienen `--focus-ring` dorado. Verificar que TODOS los elementos interactivos lo aplican:

```bash
rg "focus:" apps/dispatcher/src/components/ui/ | grep -v "focus-visible"
```

Reemplazar `focus:` simples por `focus-visible:` (para que solo se vea con teclado, no con mouse). Esto es bestia para a11y.

### 8. Filtros de feature_flags

`/admin/feature-flags`

Agregar:
- Búsqueda por nombre.
- Filtro habilitado / deshabilitado.
- (Opcional) Botón "Crear nuevo flag" → dialog con name + description + initial value.

### 9. Botón "Verificar cadena ahora" en /admin/audit

Hoy la verificación de la hash chain solo corre al cargar la página. Agregar botón "Verificar ahora" que dispare la RPC `audit_log_hash_chain` manualmente y refresque el resultado. Útil después de hacer cambios en otra pestaña.

### 10. README actualización

Actualizar `apps/dispatcher/README.md` con:
- Cómo correr el seed (`docs/seeds/demo-seed.sql`).
- Credenciales de demo.
- Páginas implementadas y su estado.
- Como correr tests (incluyendo el nuevo a11y).

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint && pnpm build
pnpm test:e2e   # incluyendo el nuevo a11y.spec.ts
pnpm dev
```

Manual:
1. Recorrer todas las páginas del admin con teclado solo (Tab / Shift+Tab / Enter / Escape) — debe ser 100% navegable.
2. Focus rings dorados visibles en todo botón / link / input.
3. Acciones destructivas: Suspender, Reembolsar, Eliminar → siempre tienen confirm.
4. Refund: confirma con texto que aclara "esto NO reembolsa en MP".
5. KYC: registros sin foto → muestran mensaje pulido, no cuadros grises.
6. Empty states: textos explicativos.
7. Errores: textos actionables ("reintentá", "contactá soporte si persiste").
8. Lighthouse Accessibility: score >95 (era >90 en prompt 09).

## Commit

```
chore(admin): polish final — a11y, microcopy, consistencia

- a11y: tests/e2e/a11y.spec.ts con axe-core, 0 críticos
- Confirms consistentes en todas las acciones destructivas
  (Suspender, Reembolsar, Eliminar)
- Refund con warning explícito: "NO ejecuta reembolso en MP"
- KYC fotos placeholders → mensaje pulido cuando no hay imagen
- Microcopy review: español rioplatense, mensajes actionables
- Focus rings dorados con focus-visible (no focus simple)
- /admin/feature-flags: búsqueda + filtro habilitado/deshabilitado
- /admin/audit: botón "Verificar cadena ahora"
- README actualizado con seed + credenciales + páginas
```

---

## ¡Listo!

Después de los 12 prompts el admin debería estar en un estado **"demo a un potencial cliente"** sólido:

- 0 placeholders cantados.
- Error boundaries por todas partes.
- Inputs validados.
- CSV export real.
- Invite por email real.
- 2FA opcional.
- Dashboard vivo y clickeable.
- Rides operativo (reasignar, compartir, mensajes).
- SOS con mapa y acciones.
- Performance respetable.
- PII enmascarada.
- Shared trip con mapa realtime.
- A11y compliant.

**Verificación final:** Recorrido manual del checklist en `docs/prompts-admin-prod/README.md` (sección "Verificación final").
