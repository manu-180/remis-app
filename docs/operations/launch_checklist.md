# Launch checklist — Remisería

## Pre-launch (T-2 semanas)

### Legal / municipio
- [ ] Reunión con municipio confirmada y acta firmada
- [ ] Ordenanza de remises vigente verificada con el letrado
- [ ] Inscripción AAIP (Agencia de Acceso a la Información Pública) en trámite
- [ ] Contratos con conductores firmados

### Base de datos y configuración
- [ ] Tarifas configuradas en tabla `fare_rules` y validadas con el dueño
- [ ] Polígonos de zona verificados con GIS municipal (tabla `tariff_zones`)
- [ ] Feature flags revisados: `mp_payment_enabled` en `false` si no va en launch
- [ ] Datos de conductores cargados en `profiles` con fotos y documentación

### Infraestructura
- [ ] Supabase Pro activado (para PITR backups y realtime escalable)
- [ ] Backups automáticos verificados en Supabase → Settings → Backups
- [ ] Domain `.com.ar` apuntado a Vercel y con SSL funcionando
- [ ] Variables de entorno en Vercel: Supabase URL, anon key, Sentry DSN, PostHog key
- [ ] Secrets en Supabase: SENTRY_DSN_EDGE, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID_OWNER, TELEGRAM_CHAT_ID_DISPATCHER

### Observabilidad
- [ ] Sentry recibe errores de prueba de las 4 apps (provocar error manual)
- [ ] PostHog captura eventos en dispatcher (verificar en PostHog dashboard)
- [ ] Alertas Telegram funcionando: enviar mensaje de prueba al bot
- [ ] `/admin/heartbeat-monitor` muestra datos en vivo
- [ ] Cron `cron-alerts-monitor` deployado y corriendo cada 5 min

### Apps móviles
- [ ] App driver en closed testing (Google Play) con 2-3 conductores piloto
- [ ] App passenger en closed testing (App Store + Play Store)
- [ ] 2-3 conductores onboardeados con la app, test end-to-end completo
- [ ] Dispatcher entrenado (sesión mínimo 2h + runbook impreso)

### Comunicaciones
- [ ] Twilio número AR adquirido y Caller ID configurado
- [ ] FCM configurado (credenciales en Supabase Secrets)
- [ ] Bot Telegram del dueño configurado y verificado

---

## Día de launch

- [ ] Verificar que todos los conductores piloto están online en el heartbeat monitor
- [ ] Dispatcher en su puesto con acceso al panel
- [ ] Habilitar feature flag `mp_payment_enabled` si aplica
- [ ] Anunciar a los primeros clientes (WhatsApp, redes sociales)
- [ ] Monitor activo en pantalla: `/admin` + `/admin/heartbeat-monitor`
- [ ] Teléfono del dueño con Telegram abierto para recibir alertas
- [ ] Runbook impreso o accesible offline por el dispatcher

### Test end-to-end antes de abrir
1. Conductor se conecta desde la app → verificar heartbeat en monitor
2. Pasajero solicita viaje desde la app → verificar que llega al dispatcher
3. Dispatcher asigna al conductor → verificar que el conductor recibe push
4. Conductor acepta → verificar que el pasajero recibe confirmación
5. Viaje completado → verificar que aparece en `/admin` con ingreso

---

## Post-launch (semana 1)

- [ ] **Daily:** Revisar `/admin/heartbeat-monitor` al inicio de cada turno
- [ ] **Daily:** Revisar errores en Sentry (Sentry.io → proyecto → Issues)
- [ ] **Daily:** Verificar que los KPIs del `/admin` tienen datos coherentes
- [ ] **Semana 1:** Reunión diaria corta con dispatcher para feedback
- [ ] **Semana 2:** Analizar funnel en PostHog (conversión pasajero)
- [ ] **Semana 2-3:** Ramp-up a más conductores
- [ ] **Semana 4:** Revisión de SLOs en `/admin/slo` — ver si se cumplen los targets

---

## Contactos de emergencia

| Rol | Contacto | Para qué |
|-----|----------|---------|
| Dueño | — | Decisiones, SOS, alertas críticas |
| Dispatcher principal | — | Operación diaria |
| Dev | — | Bugs críticos, rollbacks |
| Supabase Support | support.supabase.com | DB, realtime, backups |
| Vercel Support | vercel.com/support | Deploy, dominio |
| Twilio Support | twilio.com/help | Caller ID, SMS |
