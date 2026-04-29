# TODO — Pendientes documentados

Lista de funcionalidades que quedaron como placeholder o stub en el desarrollo del admin.

## Críticos para producción

### Pagos
- [ ] **Reembolso real con MercadoPago API** — En `/admin/payments`, el botón "Reembolsar" solo actualiza el estado local en DB. Necesita llamar al endpoint de refund de MP: `POST /v1/payments/{id}/refunds`. Ver docs: https://www.mercadopago.com.ar/developers/es/reference/chargebacks/_payments_id_refunds/post
- [ ] **Webhooks MP signature verification** — La validación de firma en `mp_webhook_events` ya existe pero revisar que el secret esté configurado en env.

### Autenticación
- [ ] **2FA (Two-Factor Authentication)** — El toggle en `/admin/settings` → Cuenta es un placeholder. Implementar con Supabase MFA: `supabase.auth.mfa.enroll()`.
- [ ] **Invite staff via email** — En `/admin/team`, el drawer de invitación muestra instrucciones manuales. Implementar edge function `admin-invite-staff` que llame a `supabase.auth.admin.inviteUserByEmail()`.

### Almacenamiento
- [ ] **Logo upload** — En `/admin/settings` → Organización, el campo logo_url es un input de texto. Implementar upload a Supabase Storage: bucket `org-assets`, RLS solo admin.

## Mejoras UX

- [ ] **Geocoding en simulador de tarifas** — El simulador acepta lat/lng manual. Integrar geocoder (ej: Nominatim, Google Maps Geocoding) para búsqueda por dirección.
- [ ] **Mapa en viaje compartido** — `/shared/[token]` muestra info textual. Agregar mapa MapLibre (con dynamic import) mostrando la posición del conductor en tiempo real via Supabase Realtime.
- [ ] **Export CSV/Excel** — Las páginas de lista (rides, drivers, passengers) tienen botón Export pendiente de implementar.
- [ ] **Notificaciones push** — Configurar web push para alertas SOS cuando el admin está en otra pestaña.

## Técnicos

- [ ] **Supabase generated types mismatch** — Los tipos generados en `packages/shared-types/database.ts` tienen algunas discrepancias con el schema real (campos PostGIS como `unknown`). Regenerar con `supabase gen types typescript` después de cada migración.
- [ ] **Edge function admin-create-driver** — Revisar que esté deployada y funcional para el wizard de creación de conductores.
- [ ] **RPC get_shared_trip** — La página `/shared/[token]` llama a `get_shared_trip(p_token)`. Si no existe, crearla. Ver doc de feature `trip_share_enabled`.
- [ ] **Playwright e2e setup** — Los tests en `apps/dispatcher/e2e/` requieren acceso a un ambiente de Supabase de test. Configurar en CI con service role key.

## Deuda técnica menor

- [ ] Reemplazar `eslint-disable @typescript-eslint/no-explicit-any` con tipos correctos una vez regenerados los tipos Supabase.
- [ ] Agregar error boundaries en las páginas más complejas (zones, fares).
- [ ] Revisar accesibilidad (a11y) de los dropdowns y modales con axe-core.
