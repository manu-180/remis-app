# Prompt 3A — Driver app: GPS background + flujo de viaje

> **LEÉ:** `00_arquitectura.md` (sec 2.3 background location), `00_design_language.md` (sec 9 driver, 11 voz), `tanda_3_core_features/README.md` (contratos), `00_file_ownership_matrix.md`.

## Objetivo

Conductor abre app, pasa onboarding bloqueante de 8 pasos (primer login), inicia turno → comienza GPS background → recibe pedido (Realtime + FCM redundante) → acepta → va a pickup con navegación → marca llegada → inicia viaje → marca fin → vuelve a disponible. Robusto en OEMs chinos.

## File ownership

✍️ `apps/driver/lib/features/{onboarding, shift, ride}/**`, `apps/driver/lib/shared/widgets/**`, `apps/driver/android/**`, `apps/driver/ios/**` (manifests, Info.plist).

## Steps

### 1. Instalar `flutter_background_geolocation`

⚠️ **Esto requiere licencia paga de Transistorsoft (USD 399 una vez por bundle ID).** Coordinar con cliente la compra **antes** de empezar. Mientras: instalar el package en modo trial (funciona pero con limitación de tiempo de tracking).

`pubspec.yaml`:
```yaml
flutter_background_geolocation: ^4.16.0
flutter_local_notifications: ^18.0.1
firebase_core: ^3.8.0
firebase_messaging: ^15.1.5
device_info_plus: ^11.2.0
permission_handler: ^11.3.1
disable_battery_optimization: ^1.1.1
url_launcher: ^6.3.1
```

Configurar Android: `android/app/build.gradle` agregar repo Transistorsoft + license key del cliente. iOS: pod adicional + capabilities.

### 2. Onboarding bloqueante de 8 pasos

Detección: el primer login del conductor (o si `driver.onboarding_completed_at is null`). Pantalla `OnboardingFlow` con `PageView` no scrolleable lateralmente — solo se avanza al completar cada paso.

#### Paso 1 — Bienvenida

- Imagen del auto típico (placeholder).
- Copy: "Bienvenido. Tenemos que configurar 7 cosas para que tu app funcione bien. Te lleva 5 minutos."
- Botón "Comenzar".

#### Paso 2 — Permiso ubicación foreground

- Prominent disclosure UI antes del prompt nativo.
- Pide `ACCESS_FINE_LOCATION` foreground.
- Si denegado: bloqueo + botón "Abrir ajustes" (deep link).

#### Paso 3 — Notificaciones

- Pide `POST_NOTIFICATIONS` (Android 13+) e iOS notif permission.
- Explicar: "Recibirás los pedidos por acá."

#### Paso 4 — Ubicación "todo el tiempo"

- Prominent disclosure detallado.
- Android 11+: explicar que se abre Settings (no se puede pedir con dialog).
- Verificar al volver foreground si se otorgó. Si no: bucle de pidiendo de nuevo con "Abrir Ajustes".

#### Paso 5 — Optimización de batería

- `disable_battery_optimization` para abrir activity correspondiente.
- "Desactivá la optimización para que la app no se cierre sola."
- Verificar `RequestIgnoreBatteryOptimizations` luego.

#### Paso 6 — OEM-specific (autostart, no killing)

- Detectar fabricante con `device_info_plus`:
  - Xiaomi → guía Mi Security app: Permisos → Autoinicio + sin restricciones.
  - Huawei → Phone Manager: app launch + manual management.
  - Realme/Oppo → similar.
  - Samsung → Device Care: skip optimizations + sleeping apps.
  - Otros → guía genérica.
- Cada fabricante tiene su screenshot guía (placeholder ahora — pedir a UX que produzca).
- Botón "Abrir Ajustes" usa intent específico cuando es posible.
- Botón "Listo" (sin verificación posible — confiamos en el conductor + heartbeat detecta más tarde).

#### Paso 7 — Test funcional ⭐ CRÍTICO

- Pantalla "Vamos a probar que funcione."
- Botón "Iniciar prueba" → la app comienza tracking en background.
- Instrucción: "Minimizá la app y dejala 60 segundos." (countdown visible).
- Al volver: la app verifica que llegaron ≥3 ubicaciones al backend (Edge Function `health-driver-test` o consulta directa).
- Si OK: ✅ "Tu app funciona. Estás listo."
- Si falla: ❌ "No llegó tu ubicación. Volvé al paso 6 y revisá los ajustes." Botón "Volver al paso 6".

#### Paso 8 — Recordatorios operativos

- 3 recordatorios fijos:
  1. "Cargador siempre conectado en el auto."
  2. "No mates la app desde recientes."
  3. "Si la app no funciona, te avisamos por SMS y se carga $0 ese turno."
- Checkbox "Entiendo" + botón "Comenzar a trabajar".
- Marca `drivers.onboarding_completed_at = now()` vía RPC.

### 3. Configurar `flutter_background_geolocation`

`apps/driver/lib/features/shift/data/location_service.dart`:

```dart
Future<void> initBgLocation({required Session session, required String agencyId}) async {
  await bg.BackgroundGeolocation.ready(bg.Config(
    desiredAccuracy: bg.Config.DESIRED_ACCURACY_HIGH,
    distanceFilter: 20.0,
    stopTimeout: 5,
    heartbeatInterval: 30,
    locationAuthorizationRequest: 'Always',
    backgroundPermissionRationale: bg.PermissionRationale(
      title: '[NOMBRE] necesita acceder a tu ubicación todo el tiempo',
      message: 'Para enviarte pedidos cuando la app está en segundo plano.',
      positiveAction: 'Habilitar',
      negativeAction: 'Cancelar',
    ),
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    foregroundService: true,
    notification: bg.Notification(
      title: '[NOMBRE] Driver',
      text: 'Disponible para pedidos',
      smallIcon: 'mipmap/ic_notification',
      sticky: true,
    ),
    url: '${Env.supabaseUrl}/rest/v1/driver_locations',
    authorization: bg.Authorization(
      strategy: 'JWT',
      accessToken: session.accessToken,
      refreshUrl: '${Env.supabaseUrl}/auth/v1/token?grant_type=refresh_token',
      refreshToken: session.refreshToken,
      refreshPayload: { 'refresh_token': '{refreshToken}' },
      expires: -1,
    ),
    headers: {
      'apikey': Env.supabaseAnonKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    locationTemplate: '''
    {
      "driver_id": "${session.user.id}",
      "location": "SRID=4326;POINT(<%= longitude %> <%= latitude %>)",
      "heading": <%= heading %>,
      "speed_mps": <%= speed %>,
      "accuracy_m": <%= accuracy %>,
      "battery_pct": <%= battery.level * 100 %>,
      "status": "available",
      "updated_at": "<%= timestamp %>"
    }
    ''',
    autoSync: true,
    batchSync: true,
    autoSyncThreshold: 5,
    maxRecordsToPersist: 1000,
    preventSuspend: true,
    activityType: bg.Config.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION,
    debug: kDebugMode,
    logLevel: bg.Config.LOG_LEVEL_VERBOSE,
  ));
}

Future<void> startTracking() async {
  await bg.BackgroundGeolocation.start();
}

Future<void> stopTracking() async {
  await bg.BackgroundGeolocation.stop();
}
```

**Importante:** la URL apunta directo a `driver_current_location` table via PostgREST (UPSERT con `Prefer: resolution=merge-duplicates`). Sin Edge Function intermedia (latencia baja).

Además, **broadcast en paralelo**: subscribe al canal Realtime privado `agency:{id}:locations` y envía `pos` event. Esto es para el dispatcher en tiempo real. La inserción a Postgres queda como persistencia muestreada.

### 4. Heartbeat y health monitor

Cada 30s (heartbeat de la lib) la app envía un POST a `/functions/v1/driver-heartbeat` con `{driver_id, battery, status, last_known_location}`. Esto popula tabla `driver_heartbeats` (created en Tanda 3D) que el backend usa para detectar Xiaomi-killing.

### 5. Iniciar/pausar turno

`HomeScreen` botón "Iniciar turno":
- Verifica permisos.
- Verifica documentos no vencidos (consulta `driver_documents` — si alguno con `expires_at < now()` → bloqueo + mostrar cuáles, botón "Contactar a la agencia").
- `startTracking()`.
- UPDATE `drivers.is_online=true, current_status='available'`.
- UI: pill verde "Disponible", botón cambia a "Pausar".

"Pausar":
- `current_status='on_break'` (sigue tracking pero no recibe pedidos).
- Pill amarilla.
- Botón "Volver" / "Terminar turno".

"Terminar turno":
- `stopTracking()`.
- `is_online=false, current_status='offline'`.
- Resumen del turno: horas, viajes, total facturado (datos calculados con RPC `get_shift_summary`).

### 6. Recibir pedido

**Doble vía** (mandatorio):
1. Realtime: subscripción al canal `driver:{id}:rides` filtrada por `driver_id=eq.{me} AND status=eq.assigned`.
2. FCM: push con `type: ride_assigned` data payload.

Idempotencia: ambos disparan el mismo `RideOfferModal` con `ride_id` como dedupe key (state local).

#### `RideOfferModal` (overlay full screen)

```
Stack:
- Mapa de fondo blureado (snapshot)
- Card centrada (radius xl, padding 24, max-width 360):
  Avatar pasajero (foto o inicial)
  Nombre del pasajero
  ─────────────
  📍 Pickup
  Dirección
  A 1.2 km · 3 min
  ─────────────
  🏁 Destino
  Dirección
  ~3.4 km · 8 min · est. $1.200
  ─────────────
  Notas: "esperar en el portón"
  
  [ ACEPTAR ] (h64 accent full width)
  [ Rechazar ] (ghost sm)

  Barra de progreso 15s al borde superior (countdown)
```

- Vibración: HeavyImpact + pattern `[0, 200, 100, 200, 100, 200]`.
- Sonido: tono custom 500ms.
- Si countdown 0 → auto-rechazo + UPDATE `rides.status='requested'` (rebote a la cola).
- Aceptar → RPC `accept_ride(ride_id)` con guard de status. Éxito → navega a `RideInProgressScreen`.

### 7. RideInProgressScreen

5 sub-estados con UI distinta cada uno:

#### 7.1 `assigned` → `en_route_to_pickup`

Ya aceptamos. Inmediatamente disparamos:
- UPDATE `rides.status='en_route_to_pickup'` + `assigned_at` (si no estaba).
- Mapa muestra ruta hacia pickup con `google_directions_api` o google_maps polylines.
- Bottom sheet:
  - Datos del pasajero (foto, nombre).
  - Dirección pickup grande.
  - Botón "Llamar" (masked call vía Twilio Proxy — Tanda 5D, mock por ahora).
  - Botón "Mensaje" (chat — Tanda 4A).
  - Botón principal "Llegué al pickup" (h64 primary full).

#### 7.2 `waiting_passenger`

Llegamos al pickup. Botón presionado → `pickup_arrived_at = now()`, `status='waiting_passenger'`. Timer arranca.

UI: mismo bottom sheet pero:
- Timer "Esperando hace 1:23".
- Botón "Iniciar viaje" (accent full).
- Botón secundario "No-show" (después de 5min — si pasajero no aparece, RPC marca cancellation `no_show`).

#### 7.3 `on_trip`

"Iniciar viaje" → `started_at`, `status='on_trip'`.
- Mapa con ruta a destino.
- Bottom sheet collapsed: "En viaje a [destino] · 8 min".
- Botón principal "Finalizar viaje".

GPS history se acumula en `driver_location_history` con `ride_id` poblado para cómputo posterior de distancia.

#### 7.4 `completed`

"Finalizar" → `ended_at`, computa distancia real (`record_ride_distance` RPC suma tramos), `status='completed'`.

UI summary:
- Distancia recorrida (km).
- Duración.
- Importe (mostrar; cálculo desde RPC `compute_final_fare`).
- Método de pago: Efectivo / MP (placeholder Tanda 4D).
- Botón "Cobrar en efectivo" → marca `payment_status='cash_at_arrival'` y vuelve a disponible.

#### 7.5 `cancelled_*`

Si el dispatcher / pasajero cancela: la subscripción Realtime detecta UPDATE → muestra alerta + vuelve a disponible.

### 8. SOS

Botón en top bar de la home + dentro del flujo de viaje. Hold-press 2s con countdown visual. Al completar:
- Inserta a `sos_events` con `prior_locations` (últimos 60s del cache local del package geolocation).
- Realtime → dispatcher.
- `tel:911` se invoca con `url_launcher`.
- Pantalla post-SOS con info "Avisamos a la agencia. Llamá al 911 si estás en peligro."

### 9. Manejo de docs vencidos durante turno

Cron de Tanda 3D detecta vencimiento → push al conductor → al renovar la app, `is_active` puede haber bajado. Si conductor intenta `startTracking` con docs vencidos: bloqueo.

### 10. Logout

Si el conductor cierra sesión durante turno activo: confirmar (modal "Estás en turno. ¿Seguro?") → terminar turno → signOut.

## Acceptance criteria

- [ ] Onboarding 8 pasos completo bloquea hasta cumplir cada paso.
- [ ] Test funcional del paso 7 verifica que GPS background sirve.
- [ ] "Iniciar turno" arranca tracking; ubicaciones llegan al backend cada distance>20m o heartbeat 30s.
- [ ] Recibir pedido funciona vía Realtime + FCM (probado matando la app y volviéndola — el FCM debe entrar).
- [ ] Aceptar → RPC con guard de status → si otro chofer lo tomó, error UI graceful.
- [ ] Flujo completo `assigned → en_route → waiting → on_trip → completed` funciona y cada UPDATE refleja en backend.
- [ ] SOS dispara `sos_events` y abre `tel:911`.
- [ ] Probado en al menos 1 dispositivo Xiaomi/Huawei o emulador con simulación.
- [ ] Commit `feat(driver): GPS background, ride lifecycle, onboarding`.

## Out of scope

- Pago MP del conductor (Tanda 4D).
- Chat con pasajero (Tanda 4A — placeholder mock acá).
- Masked calling (Tanda 5D — botón con `tel:` directo por ahora).
- Animaciones premium del flujo (Tanda 4A).
- KYC selfie pre-turno (Tanda 5D).

## Notas

- **Licencia Transistorsoft:** sin esto, en producción la app falla a las pocas horas.
- **iOS Background Mode:** revisar que `UIBackgroundModes` tenga `location, fetch, processing` y que `BGTaskSchedulerPermittedIdentifiers` esté seteado.
- **Probar offline:** simular pérdida de red y verificar que las ubicaciones se acumulan en SQLite local del package y se sincronizan al volver.
- **JWT refresh:** clave que `refreshUrl` esté configurado, sino a la hora hay 401 cascada.
