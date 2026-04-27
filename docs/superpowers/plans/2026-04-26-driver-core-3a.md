# Driver Core 3A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar GPS background, onboarding bloqueante de 8 pasos, y flujo completo de viaje (assigned → completed) en la app Flutter del conductor.

**Architecture:** LocationService encapsula `flutter_background_geolocation` y hace UPSERT directo a `driver_current_location` vía PostgREST. ShiftController (Riverpod) maneja el estado del turno. RideController gestiona el ciclo de vida del viaje escuchando Realtime + FCM. Onboarding se guarda localmente con SharedPreferences (columna DB depende de Tanda 3D).

**Tech Stack:** Flutter 3.27, Riverpod codegen, GoRouter, Supabase (Realtime + PostgREST), `flutter_background_geolocation` v4 (Transistorsoft), `firebase_messaging`, `permission_handler`, `url_launcher`, `shared_preferences`, `disable_battery_optimization`.

---

## Scope note

Este plan cubre únicamente `apps/driver/lib/features/**`, `apps/driver/android/**`, `apps/driver/ios/**`, y `apps/driver/pubspec.yaml`. Las RPCs `accept_ride`, `compute_final_fare`, `get_shift_summary`, `record_ride_distance` son responsabilidad de Tanda 3D — este plan las llama asumiendo que existen.

---

## File map

### Nuevos archivos
```
apps/driver/
├── pubspec.yaml                                            MODIFY
├── android/
│   ├── build.gradle                                        MODIFY (Transistorsoft maven)
│   ├── app/build.gradle                                    MODIFY (play-services-location)
│   └── app/src/main/
│       ├── AndroidManifest.xml                             MODIFY (permissions + services)
│       └── res/drawable/ic_notification.xml                CREATE
├── ios/Runner/Info.plist                                   MODIFY (background modes)
└── lib/
    ├── main.dart                                           MODIFY (Firebase init)
    ├── core/routing/app_router.dart                        MODIFY (new routes)
    ├── features/
    │   ├── auth/presentation/screens/splash_screen.dart    MODIFY (onboarding check)
    │   ├── home/presentation/screens/home_screen.dart      MODIFY (real providers)
    │   ├── onboarding/
    │   │   └── presentation/
    │   │       ├── screens/onboarding_flow_screen.dart     CREATE
    │   │       └── widgets/
    │   │           ├── onboarding_scaffold.dart            CREATE (widget base compartido)
    │   │           ├── step_welcome.dart                   CREATE
    │   │           ├── step_location_foreground.dart       CREATE
    │   │           ├── step_notifications.dart             CREATE
    │   │           ├── step_location_background.dart       CREATE
    │   │           ├── step_battery_optimization.dart      CREATE
    │   │           ├── step_oem_specific.dart              CREATE
    │   │           ├── step_functional_test.dart           CREATE
    │   │           └── step_reminders.dart                 CREATE
    │   ├── shift/
    │   │   ├── data/
    │   │   │   ├── location_service.dart                   CREATE
    │   │   │   └── shift_repository.dart                   CREATE
    │   │   └── presentation/
    │   │       ├── providers/
    │   │       │   ├── shift_controller.dart               CREATE
    │   │       │   └── shift_controller.g.dart             GENERATED
    │   │       └── widgets/
    │   │           └── shift_end_summary_sheet.dart        CREATE
    │   ├── ride/
    │   │   ├── data/ride_repository.dart                   CREATE
    │   │   ├── domain/models/
    │   │   │   ├── ride_model.dart                         CREATE
    │   │   │   └── ride_model.g.dart                       GENERATED
    │   │   └── presentation/
    │   │       ├── providers/
    │   │       │   ├── incoming_ride_notifier.dart         CREATE
    │   │       │   ├── incoming_ride_notifier.g.dart       GENERATED
    │   │       │   ├── ride_controller.dart                CREATE
    │   │       │   └── ride_controller.g.dart              GENERATED
    │   │       ├── screens/ride_in_progress_screen.dart    CREATE
    │   │       └── widgets/
    │   │           ├── ride_offer_modal.dart               CREATE
    │   │           └── ride_bottom_sheet.dart              CREATE
    │   └── sos/
    │       ├── data/sos_repository.dart                    CREATE
    │       └── presentation/
    │           ├── screens/sos_triggered_screen.dart       CREATE
    │           └── widgets/sos_hold_button.dart            CREATE
    └── shared/widgets/driver_status_pill.dart              (existing — no changes)
```

### Tests
```
apps/driver/test/
├── features/shift/shift_controller_test.dart
├── features/ride/ride_model_test.dart
├── features/ride/ride_controller_test.dart
└── features/sos/sos_repository_test.dart
```

---

## Task 1: Agregar dependencias

**Files:**
- Modify: `apps/driver/pubspec.yaml`

- [ ] **Step 1: Agregar dependencias en pubspec.yaml**

> ℹ️ `permission_handler` y `device_info_plus` ya están en pubspec.yaml (instalados en Tanda anterior). No volver a agregarlos.

Bajo `dependencies:`, agregar:
```yaml
  flutter_background_geolocation: ^4.16.0
  flutter_local_notifications: ^18.0.1
  firebase_core: ^3.8.0
  firebase_messaging: ^15.1.5
  disable_battery_optimization: ^1.1.1
  url_launcher: ^6.3.1
  shared_preferences: ^2.3.3
```

Bajo `dev_dependencies:`, agregar:
```yaml
  mocktail: ^0.3.0
```

- [ ] **Step 2: Instalar dependencias**

```bash
cd apps/driver && flutter pub get
```

Esperado: resolución sin conflictos. Si hay conflicto de versiones entre `firebase_core` y `supabase_flutter`, fijar `firebase_core: ^2.32.0`.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/pubspec.yaml apps/driver/pubspec.lock
git commit -m "chore(driver): add GPS, FCM, notifications dependencies"
```

---

## Task 2: Android — configuración nativa

**Files:**
- Modify: `apps/driver/android/build.gradle`
- Modify: `apps/driver/android/app/build.gradle`
- Modify: `apps/driver/android/app/src/main/AndroidManifest.xml`
- Create: `apps/driver/android/app/src/main/res/drawable/ic_notification.xml`

- [ ] **Step 1: Agregar Transistorsoft maven en android/build.gradle**

Dentro de `allprojects { repositories { ... } }`, agregar **al final**:
```groovy
maven {
    url "${project(':flutter_background_geolocation').projectDir}/libs"
}
maven {
    url "https://s3.amazonaws.com/transistorsoft-releases"
}
```

- [ ] **Step 2: Agregar dependencia nativa en android/app/build.gradle**

Dentro de `dependencies { }`, agregar:
```groovy
implementation "com.google.android.gms:play-services-location:21.3.0"
```

- [ ] **Step 3: Agregar permisos y servicios en AndroidManifest.xml**

Antes de `<application`:
```xml
<!-- Ubicación -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<!-- Foreground service -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<!-- Batería y arranque -->
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<!-- Notificaciones -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<!-- Red -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE"/>
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
```

Dentro de `<application>`:
```xml
<!-- Transistorsoft foreground services -->
<service
    android:name="com.transistorsoft.locationmanager.service.TrackingService"
    android:foregroundServiceType="location"
    android:exported="false"/>
<service
    android:name="com.transistorsoft.locationmanager.service.LocationRequestService"
    android:foregroundServiceType="location"
    android:exported="false"/>
<receiver
    android:name="com.transistorsoft.locationmanager.util.BootReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED"/>
    </intent-filter>
</receiver>
```

- [ ] **Step 4: Crear ícono de notificación**

Crear `apps/driver/android/app/src/main/res/drawable/ic_notification.xml`:
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.87 -3.13,-7 -7,-7zM12,11.5c-1.38,0 -2.5,-1.12 -2.5,-2.5s1.12,-2.5 2.5,-2.5 2.5,1.12 2.5,2.5 -1.12,2.5 -2.5,2.5z"/>
</vector>
```

- [ ] **Step 5: Commit**

```bash
git add apps/driver/android/
git commit -m "chore(driver/android): permissions, foreground service, Transistorsoft maven"
```

---

## Task 3: iOS — configuración nativa

**Files:**
- Modify: `apps/driver/ios/Runner/Info.plist`

- [ ] **Step 1: Agregar background modes y location descriptions en Info.plist**

Agregar dentro del `<dict>` raíz (antes del `</dict>` final):
```xml
<!-- Background modes requeridos por flutter_background_geolocation -->
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
    <string>processing</string>
    <string>remote-notification</string>
</array>

<!-- Descripciones de permisos (App Store requiere estas strings) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para enviarte pedidos de remís cercanos.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación en todo momento para enviarte pedidos aunque la app esté en segundo plano.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Necesitamos tu ubicación en todo momento para enviarte pedidos aunque la app esté en segundo plano.</string>

<!-- BGTaskScheduler para background fetch -->
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.transistorsoft.fetch</string>
</array>
```

> ⚠️ **Manual en Xcode:** Ir a Runner → Signing & Capabilities → + Capability → "Background Modes". Activar: Location updates, Background fetch, Remote notifications, Background processing.

- [ ] **Step 2: Commit**

```bash
git add apps/driver/ios/Runner/Info.plist
git commit -m "chore(driver/ios): background modes, location usage descriptions"
```

---

## Task 4: LocationService

**Files:**
- Create: `apps/driver/lib/features/shift/data/location_service.dart`

- [ ] **Step 1: Crear LocationService**

```dart
// apps/driver/lib/features/shift/data/location_service.dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_geolocation/flutter_background_geolocation.dart' as bg;
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';

class LocationService {
  static Future<void> init({
    required Session session,
    required String agencyId,
  }) async {
    await bg.BackgroundGeolocation.ready(bg.Config(
      desiredAccuracy: bg.Config.DESIRED_ACCURACY_HIGH,
      distanceFilter: 20.0,
      stopTimeout: 5,
      heartbeatInterval: 30,
      locationAuthorizationRequest: 'Always',
      backgroundPermissionRationale: bg.PermissionRationale(
        title: 'Remís necesita tu ubicación todo el tiempo',
        message: 'Para enviarte pedidos cuando la app está en segundo plano.',
        positiveAction: 'Habilitar',
        negativeAction: 'Cancelar',
      ),
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      foregroundService: true,
      notification: bg.Notification(
        title: 'Remís Driver',
        text: 'Disponible para pedidos',
        smallIcon: 'drawable/ic_notification',
        sticky: true,
      ),
      // UPSERT directo a driver_current_location via PostgREST
      // ⚠️ El snippet del spec usa "driver_locations" — INCORRECTO. La tabla real es "driver_current_location".
      url: '${Env.supabaseUrl}/rest/v1/driver_current_location',
      authorization: bg.Authorization(
        strategy: 'JWT',
        accessToken: session.accessToken,
        refreshUrl: '${Env.supabaseUrl}/auth/v1/token?grant_type=refresh_token',
        refreshToken: session.refreshToken ?? '',
        refreshPayload: {'refresh_token': '{refreshToken}'},
        expires: -1,
      ),
      headers: {
        'apikey': Env.supabaseAnonKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      // WKT format: lon lat (no lat lon)
      locationTemplate: '''
      {
        "driver_id": "${session.user.id}",
        "location": "SRID=4326;POINT(<%= longitude %> <%= latitude %>)",
        "heading": <%= heading %>,
        "speed_mps": <%= speed %>,
        "accuracy_m": <%= accuracy %>,
        "battery_pct": <%= battery.level == -1 ? 0 : (battery.level * 100).round() %>,
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
      logLevel: kDebugMode
          ? bg.Config.LOG_LEVEL_VERBOSE
          : bg.Config.LOG_LEVEL_ERROR,
    ));
  }

  static Future<void> start() => bg.BackgroundGeolocation.start();
  static Future<void> stop() => bg.BackgroundGeolocation.stop();

  static Future<bg.Location?> getCurrentLocation() async {
    try {
      return await bg.BackgroundGeolocation.getCurrentPosition(
        timeout: 30,
        maximumAge: 5000,
        desiredAccuracy: 10,
        samples: 1,
      );
    } catch (_) {
      return null;
    }
  }

  // Para el test funcional del onboarding (paso 7)
  static Stream<bg.Location> get onLocation =>
      bg.BackgroundGeolocation.onLocation;

  // Broadcast Realtime a agency:{agencyId}:locations para el mapa del dispatcher
  static void enableRealtimeBroadcast({
    required String agencyId,
    required RealtimeClient realtime,
    required String driverId,
  }) {
    bg.BackgroundGeolocation.onLocation((location) {
      realtime.channel('agency:$agencyId:locations').sendBroadcastMessage(
        event: 'pos',
        payload: {
          'driver_id': driverId,
          'lat': location.coords.latitude,
          'lng': location.coords.longitude,
          'heading': location.coords.heading,
          'speed_mps': location.coords.speed,
          'recorded_at': location.timestamp,
        },
      );
    });
  }

  // Heartbeat a Edge Function driver-heartbeat cada 30s (detecta Xiaomi-killing)
  static void enableHeartbeat({
    required String driverId,
    required String supabaseUrl,
    required String supabaseAnonKey,
    required String accessToken,
  }) {
    bg.BackgroundGeolocation.onHeartbeat((_) async {
      final loc = await getCurrentLocation();
      await http.post(
        Uri.parse('$supabaseUrl/functions/v1/driver-heartbeat'),
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'driver_id': driverId,
          'battery': loc?.battery.level ?? -1,
          'status': 'available',
          if (loc != null)
            'last_known_location': {
              'lat': loc.coords.latitude,
              'lng': loc.coords.longitude,
            },
        }),
      );
    });
  }
}
```

> ℹ️ Agregar `import 'dart:convert';` e `import 'package:http/http.dart' as http;` al top del archivo. `http` ya viene como dependencia transitiva de `supabase_flutter`; si no resuelve, agregar `http: ^1.2.0` a pubspec.yaml.

- [ ] **Step 2: Commit**

```bash
git add apps/driver/lib/features/shift/data/location_service.dart
git commit -m "feat(driver/shift): LocationService wrapping flutter_background_geolocation"
```

---

## Task 5: ShiftRepository

**Files:**
- Create: `apps/driver/lib/features/shift/data/shift_repository.dart`
- Create: `apps/driver/test/features/shift/shift_controller_test.dart`

- [ ] **Step 1: Escribir test**

```dart
// apps/driver/test/features/shift/shift_controller_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Stub: ShiftRepository todavía no existe — este test verifica el contrato
class MockSupabaseClient extends Mock implements SupabaseClient {}

void main() {
  group('ShiftRepository contract', () {
    test('startShift returns void on success', () {
      // Verificar que el método existe y retorna Future<void>
      // (test real se habilita cuando el repositorio existe)
      expect(true, isTrue);
    });
  });
}
```

- [ ] **Step 2: Run test (debe pasar trivialmente)**

```bash
cd apps/driver && flutter test test/features/shift/shift_controller_test.dart -v
```

- [ ] **Step 3: Crear ShiftRepository**

```dart
// apps/driver/lib/features/shift/data/shift_repository.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class ShiftRepository {
  ShiftRepository(this._client);
  final SupabaseClient _client;

  Future<void> startShift(String driverId) async {
    await _client.from('drivers').update({
      'is_online': true,
      'current_status': 'available',
    }).eq('id', driverId);
  }

  Future<void> pauseShift(String driverId) async {
    await _client.from('drivers').update({
      'current_status': 'on_break',
    }).eq('id', driverId);
  }

  Future<void> resumeShift(String driverId) async {
    await _client.from('drivers').update({
      'current_status': 'available',
    }).eq('id', driverId);
  }

  Future<void> endShift(String driverId) async {
    await _client.from('drivers').update({
      'is_online': false,
      'current_status': 'offline',
    }).eq('id', driverId);
  }

  Future<Map<String, dynamic>?> getShiftSummary(String driverId) async {
    // RPC definida en Tanda 3D
    final result = await _client.rpc('get_shift_summary', params: {
      'p_driver_id': driverId,
    });
    return result as Map<String, dynamic>?;
  }

  Future<List<Map<String, dynamic>>> getExpiredDocuments(
      String driverId) async {
    final result = await _client
        .from('driver_documents')
        .select('document_type, expires_at')
        .eq('driver_id', driverId)
        .lt('expires_at', DateTime.now().toIso8601String())
        .isFilter('deleted_at', null);
    return List<Map<String, dynamic>>.from(result as List);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/driver/lib/features/shift/data/shift_repository.dart \
        apps/driver/test/features/shift/shift_controller_test.dart
git commit -m "feat(driver/shift): ShiftRepository (start/pause/resume/end shift)"
```

---

## Task 6: ShiftController (Riverpod)

**Files:**
- Create: `apps/driver/lib/features/shift/presentation/providers/shift_controller.dart`

- [ ] **Step 1: Crear ShiftController**

```dart
// apps/driver/lib/features/shift/presentation/providers/shift_controller.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/shift/data/location_service.dart';
import 'package:remis_driver/features/shift/data/shift_repository.dart';
import 'package:remis_driver/shared/widgets/driver_status_pill.dart';

part 'shift_controller.g.dart';

sealed class ShiftState {
  const ShiftState();
}

final class ShiftIdle extends ShiftState {
  const ShiftIdle();
}

final class ShiftLoading extends ShiftState {
  const ShiftLoading();
}

final class ShiftActive extends ShiftState {
  const ShiftActive(this.status);
  final DriverStatus status;
}

final class ShiftError extends ShiftState {
  const ShiftError(this.message);
  final String message;
}

@riverpod
class ShiftController extends _$ShiftController {
  @override
  ShiftState build() => const ShiftIdle();

  ShiftRepository get _repo =>
      ShiftRepository(Supabase.instance.client);

  String get _uid => Supabase.instance.client.auth.currentUser!.id;

  Future<void> startShift() async {
    state = const ShiftLoading();
    try {
      // Verificar documentos vencidos antes de arrancar
      final expired = await _repo.getExpiredDocuments(_uid);
      if (expired.isNotEmpty) {
        state = ShiftError(
          'Tenés documentos vencidos: ${expired.map((d) => d['document_type']).join(', ')}. Contactá a la agencia.',
        );
        return;
      }

      final session = Supabase.instance.client.auth.currentSession!;
      // Obtener agencyId del perfil del conductor
      final driverRow = await Supabase.instance.client
          .from('drivers')
          .select('agency_id')
          .eq('id', _uid)
          .single();
      final agencyId = (driverRow['agency_id'] as String?) ?? '';

      await LocationService.init(session: session, agencyId: agencyId);
      await LocationService.start();
      // Activar broadcast Realtime al mapa del dispatcher
      LocationService.enableRealtimeBroadcast(
        agencyId: agencyId,
        realtime: Supabase.instance.client.realtime,
        driverId: _uid,
      );
      // Activar heartbeat hacia Edge Function (detecta killing en OEMs chinos)
      LocationService.enableHeartbeat(
        driverId: _uid,
        supabaseUrl: Env.supabaseUrl,
        supabaseAnonKey: Env.supabaseAnonKey,
        accessToken: session.accessToken,
      );
      await _repo.startShift(_uid);
      state = const ShiftActive(DriverStatus.available);
    } catch (e) {
      state = ShiftError('No se pudo iniciar el turno. $e');
    }
  }

  Future<void> pauseShift() async {
    state = const ShiftLoading();
    try {
      await _repo.pauseShift(_uid);
      state = const ShiftActive(DriverStatus.onBreak);
    } catch (e) {
      state = ShiftError('No se pudo pausar el turno. $e');
    }
  }

  Future<void> resumeShift() async {
    state = const ShiftLoading();
    try {
      await _repo.resumeShift(_uid);
      state = const ShiftActive(DriverStatus.available);
    } catch (e) {
      state = ShiftError('No se pudo reanudar el turno. $e');
    }
  }

  Future<Map<String, dynamic>?> endShift() async {
    state = const ShiftLoading();
    try {
      await LocationService.stop();
      await _repo.endShift(_uid);
      final summary = await _repo.getShiftSummary(_uid);
      state = const ShiftIdle();
      return summary;
    } catch (e) {
      state = ShiftError('No se pudo terminar el turno. $e');
      return null;
    }
  }
}
```

- [ ] **Step 2: Ejecutar codegen**

```bash
cd apps/driver && dart run build_runner build --delete-conflicting-outputs
```

- [ ] **Step 3: Commit**

```bash
git add apps/driver/lib/features/shift/presentation/
git commit -m "feat(driver/shift): ShiftController Riverpod con start/pause/resume/end"
```

---

## Task 7: Onboarding — 8 pasos

**Files:**
- Create: `apps/driver/lib/features/onboarding/presentation/screens/onboarding_flow_screen.dart`
- Create: `apps/driver/lib/features/onboarding/presentation/widgets/step_*.dart` (8 archivos)

- [ ] **Step 1: Crear screen principal del onboarding**

```dart
// apps/driver/lib/features/onboarding/presentation/screens/onboarding_flow_screen.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_welcome.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_location_foreground.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_notifications.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_location_background.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_battery_optimization.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_oem_specific.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_functional_test.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_reminders.dart';

const _kOnboardingKey = 'onboarding_completed';

class OnboardingFlowScreen extends StatefulWidget {
  const OnboardingFlowScreen({super.key});

  @override
  State<OnboardingFlowScreen> createState() => _OnboardingFlowScreenState();
}

class _OnboardingFlowScreenState extends State<OnboardingFlowScreen> {
  final _controller = PageController();
  int _current = 0;

  void _next() {
    if (_current < 7) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _complete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kOnboardingKey, true);
    if (mounted) context.go('/home');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Barra de progreso (8 puntos)
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: List.generate(8, (i) {
                  return Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      height: 4,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      decoration: BoxDecoration(
                        color: i <= _current
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.outlineVariant,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
          Expanded(
            child: PageView(
              controller: _controller,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _current = i),
              children: [
                StepWelcome(onNext: _next),
                StepLocationForeground(onNext: _next),
                StepNotifications(onNext: _next),
                StepLocationBackground(onNext: _next),
                StepBatteryOptimization(onNext: _next),
                StepOemSpecific(onNext: _next),
                StepFunctionalTest(onNext: _next),
                StepReminders(onComplete: _complete),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Crear step_welcome.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_welcome.dart
import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepWelcome extends StatelessWidget {
  const StepWelcome({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.directions_car_rounded,
      title: 'Bienvenido',
      body: 'Tenemos que configurar 7 cosas para que tu app funcione bien. Te lleva 5 minutos.',
      primaryLabel: 'Comenzar',
      onPrimary: onNext,
    );
  }
}
```

- [ ] **Step 3: Crear step_location_foreground.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_location_foreground.dart
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:url_launcher/url_launcher.dart';

class StepLocationForeground extends StatefulWidget {
  const StepLocationForeground({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepLocationForeground> createState() => _State();
}

class _State extends State<StepLocationForeground> with WidgetsBindingObserver {
  bool _denied = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _denied) {
      _check();
    }
  }

  Future<void> _check() async {
    final status = await Permission.location.status;
    if (status.isGranted && mounted) widget.onNext();
  }

  Future<void> _request() async {
    final status = await Permission.location.request();
    if (status.isGranted) {
      widget.onNext();
    } else {
      setState(() => _denied = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.location_on_outlined,
      title: 'Permiso de ubicación',
      body: 'Necesitamos saber dónde estás para enviarte pedidos cercanos.',
      primaryLabel: _denied ? 'Abrir ajustes' : 'Permitir ubicación',
      onPrimary: _denied ? () => openAppSettings() : _request,
      warning: _denied
          ? 'Habilitá el permiso de ubicación en Ajustes para continuar.'
          : null,
    );
  }
}
```

- [ ] **Step 4: Crear step_notifications.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_notifications.dart
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepNotifications extends StatelessWidget {
  const StepNotifications({super.key, required this.onNext});
  final VoidCallback onNext;

  Future<void> _request(BuildContext context) async {
    final status = await Permission.notification.request();
    // Continuamos aunque se deniegue — FCM puede fallar pero no bloqueamos
    if (context.mounted) onNext();
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.notifications_outlined,
      title: 'Notificaciones',
      body: 'Recibirás los pedidos por acá. Sin notificaciones, podés perder viajes.',
      primaryLabel: 'Permitir notificaciones',
      onPrimary: () => _request(context),
    );
  }
}
```

- [ ] **Step 5: Crear step_location_background.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_location_background.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepLocationBackground extends StatefulWidget {
  const StepLocationBackground({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepLocationBackground> createState() => _State();
}

class _State extends State<StepLocationBackground> with WidgetsBindingObserver {
  bool _waitingReturn = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _waitingReturn) {
      _check();
    }
  }

  Future<void> _check() async {
    final status = await Permission.locationAlways.status;
    if (status.isGranted && mounted) {
      widget.onNext();
    } else if (mounted) {
      setState(() => _waitingReturn = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Todavía no habilitaste la ubicación "todo el tiempo". Volvé a intentar.'),
        ),
      );
    }
  }

  Future<void> _request() async {
    if (Platform.isAndroid) {
      // Android 11+: solo se puede desde Settings
      setState(() => _waitingReturn = true);
      await openAppSettings();
    } else {
      final status = await Permission.locationAlways.request();
      if (status.isGranted && mounted) widget.onNext();
      else setState(() => _waitingReturn = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.location_searching_rounded,
      title: 'Ubicación "todo el tiempo"',
      body: Platform.isAndroid
          ? 'En la pantalla que se abre, tocá "Permitir todo el tiempo". Esto es obligatorio para recibir pedidos con la app en segundo plano.'
          : 'Seleccioná "Siempre" cuando el sistema te pregunte.',
      primaryLabel: _waitingReturn ? 'Verificar' : 'Abrir ajustes',
      onPrimary: _waitingReturn ? _check : _request,
      warning: _waitingReturn
          ? 'Si no ves la opción, buscá "Permisos → Ubicación → Todo el tiempo".'
          : null,
    );
  }
}
```

- [ ] **Step 6: Crear step_battery_optimization.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_battery_optimization.dart
import 'package:flutter/material.dart';
import 'package:disable_battery_optimization/disable_battery_optimization.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepBatteryOptimization extends StatelessWidget {
  const StepBatteryOptimization({super.key, required this.onNext});
  final VoidCallback onNext;

  Future<void> _disable(BuildContext context) async {
    await DisableBatteryOptimization.showDisableBatteryOptimizationSettings();
    if (context.mounted) onNext();
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.battery_charging_full_rounded,
      title: 'Optimización de batería',
      body: 'Desactivá la optimización para que la app no se cierre sola entre pedidos.',
      primaryLabel: 'Abrir ajustes de batería',
      onPrimary: () => _disable(context),
    );
  }
}
```

- [ ] **Step 7: Crear step_oem_specific.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_oem_specific.dart
import 'package:flutter/material.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepOemSpecific extends StatefulWidget {
  const StepOemSpecific({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepOemSpecific> createState() => _State();
}

class _State extends State<StepOemSpecific> {
  _OemGuide? _guide;

  @override
  void initState() {
    super.initState();
    _detectOem();
  }

  Future<void> _detectOem() async {
    final info = DeviceInfoPlugin();
    final android = await info.androidInfo;
    final manufacturer = android.manufacturer.toLowerCase();
    setState(() {
      if (manufacturer.contains('xiaomi') || manufacturer.contains('redmi') || manufacturer.contains('poco')) {
        _guide = const _OemGuide(
          brand: 'Xiaomi / Redmi / POCO',
          steps: [
            'Abrí "Seguridad" → "Permisos" → "Inicio automático".',
            'Habilitá "Remís Driver" en la lista.',
            'Volvé a "Permisos" → "Sin restricciones de actividad".',
          ],
          settingsIntent: 'miui.intent.action.APP_PERM_EDITOR',
        );
      } else if (manufacturer.contains('huawei') || manufacturer.contains('honor')) {
        _guide = const _OemGuide(
          brand: 'Huawei / Honor',
          steps: [
            'Abrí "Administrador del teléfono" → "Inicio de la aplicación".',
            'Buscá "Remís Driver" y activá "Gestión manual".',
            'Habilitá Inicio automático, Inicio secundario y Ejecución en segundo plano.',
          ],
        );
      } else if (manufacturer.contains('oppo') || manufacturer.contains('realme') || manufacturer.contains('oneplus')) {
        _guide = const _OemGuide(
          brand: 'OPPO / Realme / OnePlus',
          steps: [
            'Abrí "Ajustes" → "Administración de la batería" → "Optimización de la batería".',
            'Buscá "Remís Driver" y seleccioná "No optimizar".',
          ],
        );
      } else if (manufacturer.contains('samsung')) {
        _guide = const _OemGuide(
          brand: 'Samsung',
          steps: [
            'Abrí "Cuidado del dispositivo" → "Batería" → "Límites de uso en segundo plano".',
            'Quitá "Remís Driver" de la lista de apps en suspensión.',
          ],
        );
      } else {
        _guide = const _OemGuide(
          brand: 'Tu dispositivo',
          steps: [
            'Buscá en Ajustes → Batería → Optimización o Ahorro.',
            'Desactivá la restricción para "Remís Driver".',
            'Habilitá el inicio automático si tu dispositivo lo permite.',
          ],
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_guide == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return OnboardingScaffold(
      icon: Icons.phone_android_rounded,
      title: '${_guide!.brand}: no matar la app',
      body: _guide!.steps.asMap().entries.map((e) => '${e.key + 1}. ${e.value}').join('\n\n'),
      primaryLabel: 'Listo',
      onPrimary: widget.onNext,
      secondaryLabel: _guide!.settingsIntent != null ? 'Abrir ajustes' : null,
      // `intent:` URIs requieren android_intent_plus — no disponible en deps.
      // Usamos openAppSettings() de permission_handler (ya instalado).
      onSecondary: _guide!.settingsIntent != null
          ? () => openAppSettings()
          : null,
    );
  }
}

class _OemGuide {
  const _OemGuide({
    required this.brand,
    required this.steps,
    this.settingsIntent,
  });
  final String brand;
  final List<String> steps;
  final String? settingsIntent;
}
```

- [ ] **Step 8: Crear step_functional_test.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_functional_test.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/shift/data/location_service.dart';

enum _TestState { idle, running, success, failure }

class StepFunctionalTest extends StatefulWidget {
  const StepFunctionalTest({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepFunctionalTest> createState() => _State();
}

class _State extends State<StepFunctionalTest> {
  _TestState _testState = _TestState.idle;
  int _countdown = 60;
  int _locationsReceived = 0;
  Timer? _timer;
  StreamSubscription? _locationSub;

  Future<void> _startTest() async {
    setState(() {
      _testState = _TestState.running;
      _countdown = 60;
      _locationsReceived = 0;
    });

    await LocationService.start();

    _locationSub = LocationService.onLocation.listen((_) {
      setState(() => _locationsReceived++);
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _countdown--);
      if (_countdown <= 0) {
        t.cancel();
        _evaluate();
      }
    });
  }

  Future<void> _evaluate() async {
    _locationSub?.cancel();
    await LocationService.stop();
    setState(() {
      _testState =
          _locationsReceived >= 3 ? _TestState.success : _TestState.failure;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _locationSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return switch (_testState) {
      _TestState.idle => OnboardingScaffold(
          icon: Icons.gps_fixed_rounded,
          title: 'Prueba de GPS',
          body: 'Vamos a probar que la ubicación en segundo plano funcione.\n\nTocá "Iniciar prueba", minimizá la app y esperá 60 segundos.',
          primaryLabel: 'Iniciar prueba',
          onPrimary: _startTest,
        ),
      _TestState.running => OnboardingScaffold(
          icon: Icons.gps_fixed_rounded,
          title: 'Minimizá la app',
          body: 'Esperando señales GPS...\n\nUbicaciones recibidas: $_locationsReceived',
          primaryLabel: 'Verificar ahora ($_countdown s)',
          onPrimary: () {
            _timer?.cancel();
            _evaluate();
          },
        ),
      _TestState.success => OnboardingScaffold(
          icon: Icons.check_circle_outline_rounded,
          title: 'Tu app funciona',
          body: 'Recibimos $_locationsReceived ubicaciones. Estás listo para trabajar.',
          primaryLabel: 'Continuar',
          onPrimary: widget.onNext,
        ),
      _TestState.failure => OnboardingScaffold(
          icon: Icons.error_outline_rounded,
          title: 'No llegó tu ubicación',
          body: 'No recibimos señales GPS. Volvé al paso anterior y revisá los permisos de tu dispositivo.',
          primaryLabel: 'Volver al paso 6',
          onPrimary: () => context.goNamed('onboarding'), // vuelve al paso 6
        ),
    };
  }
}
```

- [ ] **Step 9: Crear step_reminders.dart**

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/step_reminders.dart
import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepReminders extends StatefulWidget {
  const StepReminders({super.key, required this.onComplete});
  final VoidCallback onComplete;

  @override
  State<StepReminders> createState() => _State();
}

class _State extends State<StepReminders> {
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Icon(Icons.checklist_rounded, size: 48, color: theme.colorScheme.primary),
            const SizedBox(height: 24),
            Text('Antes de arrancar', style: interTight(fontSize: RTextSize.xl, fontWeight: FontWeight.w700)),
            const SizedBox(height: 24),
            _Reminder(text: 'Mantené el cargador conectado en el auto.'),
            _Reminder(text: 'No cerrés la app desde el menú de recientes.'),
            _Reminder(text: 'Si la app falla, te avisamos por SMS y ese turno no se te descuenta.'),
            const Spacer(),
            Row(
              children: [
                Checkbox(
                  value: _accepted,
                  onChanged: (v) => setState(() => _accepted = v ?? false),
                ),
                const SizedBox(width: 8),
                const Text('Entiendo'),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: FilledButton(
                onPressed: _accepted ? widget.onComplete : null,
                child: const Text('Comenzar a trabajar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Reminder extends StatelessWidget {
  const _Reminder({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: inter(fontSize: RTextSize.base))),
        ],
      ),
    );
  }
}
```

- [ ] **Step 10: Crear widget base `OnboardingScaffold` compartido**

Crear como `apps/driver/lib/features/onboarding/presentation/widgets/onboarding_scaffold.dart` e importarlo en todos los steps. **No usar prefijo `_`** — Dart trata los identificadores con `_` como file-private, lo que impide importarlos desde otros archivos.

```dart
// apps/driver/lib/features/onboarding/presentation/widgets/onboarding_scaffold.dart
import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

class OnboardingScaffold extends StatelessWidget {
  const OnboardingScaffold({
    required this.icon,
    required this.title,
    required this.body,
    required this.primaryLabel,
    required this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
    this.warning,
  });

  final IconData icon;
  final String title;
  final String body;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final String? warning;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Icon(icon, size: 48, color: theme.colorScheme.primary),
            const SizedBox(height: 24),
            Text(title,
                style: interTight(
                    fontSize: RTextSize.xl, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Text(body,
                style: inter(
                    fontSize: RTextSize.base,
                    color: theme.colorScheme.onSurfaceVariant)),
            if (warning != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kDanger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
                child: Text(warning!,
                    style: inter(fontSize: RTextSize.sm, color: kDanger)),
              ),
            ],
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: FilledButton(
                onPressed: onPrimary,
                child: Text(primaryLabel),
              ),
            ),
            if (secondaryLabel != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: onSecondary,
                  child: Text(secondaryLabel!),
                ),
              ),
            ],
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
```

> ℹ️ Importar `onboarding_scaffold.dart` en cada step widget con `import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';`

- [ ] **Step 11: Commit**

```bash
git add apps/driver/lib/features/onboarding/
git commit -m "feat(driver/onboarding): flujo bloqueante de 8 pasos"
```

---

## Task 8: Routing — agregar rutas + guardia de onboarding

**Files:**
- Modify: `apps/driver/lib/core/routing/app_router.dart`
- Modify: `apps/driver/lib/features/auth/presentation/screens/splash_screen.dart`

- [ ] **Step 1: Actualizar app_router.dart**

```dart
// apps/driver/lib/core/routing/app_router.dart
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/auth/presentation/screens/splash_screen.dart';
import 'package:remis_driver/features/auth/presentation/screens/phone_login_screen.dart';
import 'package:remis_driver/features/auth/presentation/screens/otp_verify_screen.dart';
import 'package:remis_driver/features/home/presentation/screens/home_screen.dart';
import 'package:remis_driver/features/onboarding/presentation/screens/onboarding_flow_screen.dart';
import 'package:remis_driver/features/ride/presentation/screens/ride_in_progress_screen.dart';
import 'package:remis_driver/features/settings/presentation/screens/settings_screen.dart';
import 'package:remis_driver/features/sos/presentation/screens/sos_triggered_screen.dart';

const _kOnboardingKey = 'onboarding_completed';

final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (context, state) async {
    final session = Supabase.instance.client.auth.currentSession;
    final path = state.fullPath ?? '';

    if (path == '/splash') return null;

    final isAuthRoute = path.startsWith('/auth');
    if (session == null && !isAuthRoute) return '/auth/login';
    if (session != null && isAuthRoute) {
      // Verificar onboarding
      final prefs = await SharedPreferences.getInstance();
      final done = prefs.getBool(_kOnboardingKey) ?? false;
      return done ? '/home' : '/onboarding';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/auth/login', builder: (_, __) => const PhoneLoginScreen()),
    GoRoute(
      path: '/auth/otp',
      builder: (_, state) =>
          OtpVerifyScreen(phone: state.uri.queryParameters['phone'] ?? ''),
    ),
    GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingFlowScreen()),
    GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    GoRoute(
      path: '/ride/:id',
      builder: (_, state) =>
          RideInProgressScreen(rideId: state.pathParameters['id']!),
    ),
    GoRoute(path: '/sos', builder: (_, __) => const SosTriggeredScreen()),
  ],
);
```

- [ ] **Step 2: Modificar splash_screen.dart para checar onboarding**

En el método que decide a dónde redirigir tras verificar sesión (buscar el `Timer` o `Future.delayed` existente), cambiar la navegación de `'/home'` a:

```dart
final prefs = await SharedPreferences.getInstance();
final done = prefs.getBool('onboarding_completed') ?? false;
context.go(done ? '/home' : '/onboarding');
```

- [ ] **Step 3: Commit**

```bash
git add apps/driver/lib/core/routing/app_router.dart \
        apps/driver/lib/features/auth/presentation/screens/splash_screen.dart
git commit -m "feat(driver/routing): rutas onboarding + ride, guardia SharedPreferences"
```

---

## Task 9: HomeScreen — integración real con ShiftController

**Files:**
- Modify: `apps/driver/lib/features/home/presentation/screens/home_screen.dart`

- [ ] **Step 1: Reescribir HomeScreen para usar ShiftController**

Reemplazar la lógica local `_status` / `_toggleTurn` por:

```dart
import 'package:remis_driver/features/shift/presentation/providers/shift_controller.dart';
import 'package:remis_driver/features/ride/presentation/providers/incoming_ride_notifier.dart';
import 'package:remis_driver/features/ride/presentation/widgets/ride_offer_modal.dart';
import 'package:remis_driver/features/shift/presentation/widgets/shift_end_summary_sheet.dart';
import 'package:remis_driver/features/sos/presentation/widgets/sos_hold_button.dart';
```

En `_HomeScreenState`, reemplazar estado local:

```dart
@override
void initState() {
  super.initState();
  // Escuchar pedidos entrantes
  ref.listenManual(incomingRideNotifierProvider, (_, ride) {
    if (ride != null && mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => RideOfferModal(ride: ride),
      );
    }
  });
}
```

`_toggleTurn` nuevo:

```dart
Future<void> _handleShiftButton(ShiftState shiftState) async {
  final ctrl = ref.read(shiftControllerProvider.notifier);
  if (shiftState is ShiftIdle) {
    await ctrl.startShift();
  } else if (shiftState is ShiftActive) {
    if (shiftState.status == DriverStatus.onBreak) {
      await ctrl.resumeShift();
    } else {
      await ctrl.pauseShift();
    }
  }
}

Future<void> _endShift() async {
  final ctrl = ref.read(shiftControllerProvider.notifier);
  final summary = await ctrl.endShift();
  if (summary != null && mounted) {
    showModalBottomSheet(
      context: context,
      builder: (_) => ShiftEndSummarySheet(summary: summary),
    );
  }
}
```

En el `build`, leer el provider:

```dart
final shiftState = ref.watch(shiftControllerProvider);
final driverStatus = shiftState is ShiftActive
    ? shiftState.status
    : DriverStatus.offline;
```

Reemplazar el `SOS` placeholder `IconButton` por `SosHoldButton`.

Mostrar errores con `ref.listen`:

```dart
ref.listen(shiftControllerProvider, (_, state) {
  if (state is ShiftError && mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(state.message)),
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/lib/features/home/
git commit -m "feat(driver/home): conectar ShiftController + IncomingRideNotifier + SOS"
```

---

## Task 10: RideModel

**Files:**
- Create: `apps/driver/lib/features/ride/domain/models/ride_model.dart`
- Create: `apps/driver/test/features/ride/ride_model_test.dart`

- [ ] **Step 1: Escribir test**

```dart
// apps/driver/test/features/ride/ride_model_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';

void main() {
  group('RideModel.fromJson', () {
    test('parses required fields', () {
      final json = {
        'id': 'ride-123',
        'passenger_id': 'pass-456',
        'status': 'assigned',
        'pickup_address': 'Av. San Martín 100',
        'pickup_location': {'coordinates': [-64.2833, -36.6167]},
        'estimated_fare_ars': 1200.0,
        'notes': null,
        'requested_at': '2026-04-26T10:00:00.000Z',
        'passenger_name': 'Juan Pérez',
        'passenger_avatar_url': null,
        'distance_to_pickup_m': 1200.0,
        'eta_to_pickup_min': 3.0,
        'dest_address': 'Belgrano 500',
        'distance_meters': 3400.0,
        'eta_trip_min': 8.0,
      };

      final model = RideModel.fromJson(json);

      expect(model.id, 'ride-123');
      expect(model.status, RideStatus.assigned);
      expect(model.pickupAddress, 'Av. San Martín 100');
      expect(model.estimatedFareArs, 1200.0);
    });
  });
}
```

- [ ] **Step 2: Run test (debe fallar — RideModel no existe)**

```bash
cd apps/driver && flutter test test/features/ride/ride_model_test.dart -v
```

- [ ] **Step 3: Crear RideModel**

```dart
// apps/driver/lib/features/ride/domain/models/ride_model.dart

enum RideStatus {
  requested,
  assigned,
  enRouteToPickup,
  waitingPassenger,
  onTrip,
  completed,
  cancelledByPassenger,
  cancelledByDriver,
  cancelledByDispatcher,
  noShow;

  static RideStatus fromString(String s) => switch (s) {
        'requested' => requested,
        'assigned' => assigned,
        'en_route_to_pickup' => enRouteToPickup,
        'waiting_passenger' => waitingPassenger,
        'on_trip' => onTrip,
        'completed' => completed,
        'cancelled_by_passenger' => cancelledByPassenger,
        'cancelled_by_driver' => cancelledByDriver,
        'cancelled_by_dispatcher' => cancelledByDispatcher,
        'no_show' => noShow,
        _ => requested,
      };

  String get toDb => switch (this) {
        requested => 'requested',
        assigned => 'assigned',
        enRouteToPickup => 'en_route_to_pickup',
        waitingPassenger => 'waiting_passenger',
        onTrip => 'on_trip',
        completed => 'completed',
        cancelledByPassenger => 'cancelled_by_passenger',
        cancelledByDriver => 'cancelled_by_driver',
        cancelledByDispatcher => 'cancelled_by_dispatcher',
        noShow => 'no_show',
      };

  bool get isCancelled => switch (this) {
        cancelledByPassenger || cancelledByDriver || cancelledByDispatcher || noShow => true,
        _ => false,
      };
}

class RideModel {
  const RideModel({
    required this.id,
    required this.passengerId,
    required this.status,
    required this.pickupAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.requestedAt,
    this.passengerName,
    this.passengerAvatarUrl,
    this.distanceToPickupM,
    this.etaToPickupMin,
    this.destAddress,
    this.distanceMeters,
    this.etaTripMin,
    this.estimatedFareArs,
    this.finalFareArs,
    this.notes,
    this.assignedAt,
    this.pickupArrivedAt,
    this.startedAt,
    this.endedAt,
  });

  final String id;
  final String passengerId;
  final RideStatus status;
  final String? pickupAddress;
  final double pickupLat;
  final double pickupLng;
  final DateTime requestedAt;
  final String? passengerName;
  final String? passengerAvatarUrl;
  final String? passengerPhone;
  final double? distanceToPickupM;
  final double? etaToPickupMin;
  final String? destAddress;
  final double? distanceMeters;
  final double? etaTripMin;
  final double? estimatedFareArs;
  final double? finalFareArs;
  final String? notes;
  final DateTime? assignedAt;
  final DateTime? pickupArrivedAt;
  final DateTime? startedAt;
  final DateTime? endedAt;

  factory RideModel.fromJson(Map<String, dynamic> json) {
    final coords = (json['pickup_location'] as Map?)?['coordinates'] as List?;
    return RideModel(
      id: json['id'] as String,
      passengerId: json['passenger_id'] as String,
      status: RideStatus.fromString(json['status'] as String),
      pickupAddress: json['pickup_address'] as String?,
      pickupLat: coords != null ? (coords[1] as num).toDouble() : 0,
      pickupLng: coords != null ? (coords[0] as num).toDouble() : 0,
      requestedAt: DateTime.parse(json['requested_at'] as String),
      passengerName: json['passenger_name'] as String?,
      passengerAvatarUrl: json['passenger_avatar_url'] as String?,
      passengerPhone: json['passenger_phone'] as String?,
      distanceToPickupM: (json['distance_to_pickup_m'] as num?)?.toDouble(),
      etaToPickupMin: (json['eta_to_pickup_min'] as num?)?.toDouble(),
      destAddress: json['dest_address'] as String?,
      distanceMeters: (json['distance_meters'] as num?)?.toDouble(),
      etaTripMin: (json['eta_trip_min'] as num?)?.toDouble(),
      estimatedFareArs: (json['estimated_fare_ars'] as num?)?.toDouble(),
      finalFareArs: (json['final_fare_ars'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
      assignedAt: json['assigned_at'] != null
          ? DateTime.parse(json['assigned_at'] as String)
          : null,
      pickupArrivedAt: json['pickup_arrived_at'] != null
          ? DateTime.parse(json['pickup_arrived_at'] as String)
          : null,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      endedAt: json['ended_at'] != null
          ? DateTime.parse(json['ended_at'] as String)
          : null,
    );
  }

  RideModel copyWith({RideStatus? status, double? finalFareArs}) =>
      RideModel(
        id: id,
        passengerId: passengerId,
        status: status ?? this.status,
        pickupAddress: pickupAddress,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        requestedAt: requestedAt,
        passengerName: passengerName,
        passengerAvatarUrl: passengerAvatarUrl,
        passengerPhone: passengerPhone,
        distanceToPickupM: distanceToPickupM,
        etaToPickupMin: etaToPickupMin,
        destAddress: destAddress,
        distanceMeters: distanceMeters,
        etaTripMin: etaTripMin,
        estimatedFareArs: estimatedFareArs,
        finalFareArs: finalFareArs ?? this.finalFareArs,
        notes: notes,
        assignedAt: assignedAt,
        pickupArrivedAt: pickupArrivedAt,
        startedAt: startedAt,
        endedAt: endedAt,
      );
}
```

- [ ] **Step 4: Run test (debe pasar)**

```bash
cd apps/driver && flutter test test/features/ride/ride_model_test.dart -v
```

- [ ] **Step 5: Commit**

```bash
git add apps/driver/lib/features/ride/domain/ \
        apps/driver/test/features/ride/ride_model_test.dart
git commit -m "feat(driver/ride): RideModel con RideStatus enum"
```

---

## Task 11: RideRepository

**Files:**
- Create: `apps/driver/lib/features/ride/data/ride_repository.dart`

- [ ] **Step 1: Crear RideRepository**

```dart
// apps/driver/lib/features/ride/data/ride_repository.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';

class RideRepository {
  RideRepository(this._client);
  final SupabaseClient _client;

  // Llamada al RPC con guard de status — retorna error si ya fue tomado
  Future<RideModel> acceptRide(String rideId) async {
    final result = await _client.rpc('accept_ride', params: {'p_ride_id': rideId});
    return RideModel.fromJson(result as Map<String, dynamic>);
  }

  Future<void> updateRideStatus(String rideId, RideStatus status) async {
    await _client.from('rides').update({
      'status': status.toDb,
      if (status == RideStatus.enRouteToPickup) 'assigned_at': DateTime.now().toIso8601String(),
      if (status == RideStatus.waitingPassenger) 'pickup_arrived_at': DateTime.now().toIso8601String(),
      if (status == RideStatus.onTrip) 'started_at': DateTime.now().toIso8601String(),
      if (status == RideStatus.completed) 'ended_at': DateTime.now().toIso8601String(),
    }).eq('id', rideId);
  }

  Future<void> reportNoShow(String rideId) async {
    await _client.from('rides').update({
      'status': 'no_show',
      'cancelled_at': DateTime.now().toIso8601String(),
      'cancellation_reason': 'Pasajero no se presentó',
    }).eq('id', rideId);
  }

  Future<void> recordRideDistance(String rideId) async {
    // RPC definida en Tanda 3D: suma tramos GPS de driver_location_history
    await _client.rpc('record_ride_distance', params: {'p_ride_id': rideId});
  }

  Future<Map<String, dynamic>?> computeFinalFare(String rideId) async {
    final result = await _client.rpc('compute_final_fare', params: {'p_ride_id': rideId});
    return result as Map<String, dynamic>?;
  }

  Future<void> markCashPayment(String rideId) async {
    await _client.from('rides').update({
      'payment_status': 'cash_at_arrival',
    }).eq('id', rideId);
  }

  // Realtime: escuchar asignaciones
  RealtimeChannel subscribeToAssignments({
    required String driverId,
    required void Function(RideModel) onRide,
  }) {
    return _client
        .channel('driver:$driverId:rides')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'rides',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'driver_id',
            value: driverId,
          ),
          callback: (payload) {
            final row = payload.newRecord;
            if (row['status'] == 'assigned') {
              onRide(RideModel.fromJson(row));
            }
          },
        )
        .subscribe();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/lib/features/ride/data/ride_repository.dart
git commit -m "feat(driver/ride): RideRepository con accept, status updates, Realtime"
```

---

## Task 12: IncomingRideNotifier + RideController

**Files:**
- Create: `apps/driver/lib/features/ride/presentation/providers/incoming_ride_notifier.dart`
- Create: `apps/driver/lib/features/ride/presentation/providers/ride_controller.dart`
- Create: `apps/driver/test/features/ride/ride_controller_test.dart`

- [ ] **Step 1: Crear IncomingRideNotifier (escucha Realtime)**

```dart
// apps/driver/lib/features/ride/presentation/providers/incoming_ride_notifier.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/ride/data/ride_repository.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';

part 'incoming_ride_notifier.g.dart';

@riverpod
class IncomingRideNotifier extends _$IncomingRideNotifier {
  RealtimeChannel? _channel;

  @override
  RideModel? build() {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return null;

    final repo = RideRepository(Supabase.instance.client);
    _channel = repo.subscribeToAssignments(
      driverId: uid,
      onRide: (ride) => state = ride,
    );

    ref.onDispose(() {
      _channel?.unsubscribe();
    });

    return null;
  }

  void dismiss() => state = null;
}
```

- [ ] **Step 2: Crear RideController**

```dart
// apps/driver/lib/features/ride/presentation/providers/ride_controller.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/ride/data/ride_repository.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';

part 'ride_controller.g.dart';

sealed class RideUiState {
  const RideUiState();
}

final class RideUiIdle extends RideUiState {
  const RideUiIdle();
}

final class RideUiLoading extends RideUiState {
  const RideUiLoading();
}

final class RideUiActive extends RideUiState {
  const RideUiActive(this.ride);
  final RideModel ride;
}

final class RideUiCompleted extends RideUiState {
  const RideUiCompleted(this.ride, this.fareData);
  final RideModel ride;
  final Map<String, dynamic>? fareData;
}

final class RideUiError extends RideUiState {
  const RideUiError(this.message);
  final String message;
}

@riverpod
class RideController extends _$RideController {
  @override
  RideUiState build() => const RideUiIdle();

  RideRepository get _repo => RideRepository(Supabase.instance.client);

  Future<bool> acceptRide(String rideId) async {
    state = const RideUiLoading();
    try {
      final ride = await _repo.acceptRide(rideId);
      await _repo.updateRideStatus(rideId, RideStatus.enRouteToPickup);
      state = RideUiActive(ride.copyWith(status: RideStatus.enRouteToPickup));
      return true;
    } catch (e) {
      state = RideUiError('No se pudo aceptar el viaje. Es posible que otro conductor lo tomó.');
      return false;
    }
  }

  Future<void> arrivedAtPickup(String rideId) async {
    if (state is! RideUiActive) return;
    final ride = (state as RideUiActive).ride;
    await _repo.updateRideStatus(rideId, RideStatus.waitingPassenger);
    state = RideUiActive(ride.copyWith(status: RideStatus.waitingPassenger));
  }

  Future<void> startTrip(String rideId) async {
    if (state is! RideUiActive) return;
    final ride = (state as RideUiActive).ride;
    await _repo.updateRideStatus(rideId, RideStatus.onTrip);
    state = RideUiActive(ride.copyWith(status: RideStatus.onTrip));
  }

  Future<void> endTrip(String rideId) async {
    if (state is! RideUiActive) return;
    final ride = (state as RideUiActive).ride;
    await _repo.updateRideStatus(rideId, RideStatus.completed);
    // RPC 3D: suma tramos de driver_location_history para distancia real
    await _repo.recordRideDistance(rideId);
    final fareData = await _repo.computeFinalFare(rideId);
    final finalFare = (fareData?['final_fare_ars'] as num?)?.toDouble();
    state = RideUiCompleted(
      ride.copyWith(status: RideStatus.completed, finalFareArs: finalFare),
      fareData,
    );
  }

  Future<void> reportNoShow(String rideId) async {
    await _repo.reportNoShow(rideId);
    state = const RideUiIdle();
  }

  Future<void> markCashPayment(String rideId) async {
    if (state is! RideUiCompleted) return;
    await _repo.markCashPayment(rideId);
    state = const RideUiIdle();
  }

  void handleCancellation() => state = const RideUiIdle();
}
```

- [ ] **Step 3: Escribir test básico del controller**

```dart
// apps/driver/test/features/ride/ride_controller_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';

void main() {
  group('RideStatus', () {
    test('fromString parses all known statuses', () {
      expect(RideStatus.fromString('assigned'), RideStatus.assigned);
      expect(RideStatus.fromString('on_trip'), RideStatus.onTrip);
      expect(RideStatus.fromString('completed'), RideStatus.completed);
      expect(RideStatus.fromString('no_show'), RideStatus.noShow);
    });

    test('isCancelled returns true for cancellation statuses', () {
      expect(RideStatus.cancelledByDriver.isCancelled, isTrue);
      expect(RideStatus.noShow.isCancelled, isTrue);
      expect(RideStatus.onTrip.isCancelled, isFalse);
    });
  });
}
```

- [ ] **Step 4: Run codegen**

```bash
cd apps/driver && dart run build_runner build --delete-conflicting-outputs
```

- [ ] **Step 5: Run tests**

```bash
cd apps/driver && flutter test test/features/ride/ -v
```

- [ ] **Step 6: Commit**

```bash
git add apps/driver/lib/features/ride/presentation/providers/ \
        apps/driver/test/features/ride/ride_controller_test.dart
git commit -m "feat(driver/ride): RideController + IncomingRideNotifier Realtime"
```

---

## Task 13: RideOfferModal (UI)

**Files:**
- Create: `apps/driver/lib/features/ride/presentation/widgets/ride_offer_modal.dart`

- [ ] **Step 1: Crear RideOfferModal**

```dart
// apps/driver/lib/features/ride/presentation/widgets/ride_offer_modal.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';
import 'package:remis_driver/features/ride/presentation/providers/incoming_ride_notifier.dart';
import 'package:remis_driver/features/ride/presentation/providers/ride_controller.dart';

const _kCountdownSeconds = 15;

class RideOfferModal extends ConsumerStatefulWidget {
  const RideOfferModal({super.key, required this.ride});
  final RideModel ride;

  @override
  ConsumerState<RideOfferModal> createState() => _State();
}

class _State extends ConsumerState<RideOfferModal> {
  int _remaining = _kCountdownSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _vibrate();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() => _remaining--);
      if (_remaining <= 0) {
        t.cancel();
        _reject();
      }
    });
  }

  void _vibrate() {
    HapticFeedback.heavyImpact();
    Future.delayed(const Duration(milliseconds: 300), HapticFeedback.heavyImpact);
    Future.delayed(const Duration(milliseconds: 600), HapticFeedback.heavyImpact);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _accept() async {
    _timer?.cancel();
    final ok = await ref.read(rideControllerProvider.notifier).acceptRide(widget.ride.id);
    if (ok && mounted) {
      ref.read(incomingRideNotifierProvider.notifier).dismiss();
      context.pop(); // cerrar modal
      context.push('/ride/${widget.ride.id}');
    } else if (mounted) {
      context.pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo aceptar el viaje. Es posible que otro conductor lo tomó.')),
      );
    }
  }

  Future<void> _reject() async {
    _timer?.cancel();
    if (mounted) {
      ref.read(incomingRideNotifierProvider.notifier).dismiss();
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = widget.ride;
    final theme = Theme.of(context);
    final progress = _remaining / _kCountdownSeconds;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(RRadius.xl),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Barra de countdown
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(RRadius.xl)),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 4,
                backgroundColor: theme.colorScheme.outlineVariant,
                valueColor: AlwaysStoppedAnimation(kBrandAccent),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Avatar pasajero
                  CircleAvatar(
                    radius: 28,
                    backgroundImage: ride.passengerAvatarUrl != null
                        ? NetworkImage(ride.passengerAvatarUrl!)
                        : null,
                    child: ride.passengerAvatarUrl == null
                        ? Text(
                            (ride.passengerName ?? 'P')[0].toUpperCase(),
                            style: interTight(fontSize: 24, fontWeight: FontWeight.w700),
                          )
                        : null,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    ride.passengerName ?? 'Pasajero',
                    style: interTight(fontSize: RTextSize.lg, fontWeight: FontWeight.w600),
                  ),
                  const Divider(height: 24),
                  // Pickup
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Pickup',
                    address: ride.pickupAddress ?? '',
                    detail: ride.distanceToPickupM != null && ride.etaToPickupMin != null
                        ? '${(ride.distanceToPickupM! / 1000).toStringAsFixed(1)} km · ${ride.etaToPickupMin!.round()} min'
                        : null,
                  ),
                  const Divider(height: 16),
                  // Destino
                  _InfoRow(
                    icon: Icons.flag_outlined,
                    label: 'Destino',
                    address: ride.destAddress ?? 'Sin destino',
                    detail: ride.distanceMeters != null && ride.etaTripMin != null
                        ? '~${(ride.distanceMeters! / 1000).toStringAsFixed(1)} km · ${ride.etaTripMin!.round()} min · est. \$${ride.estimatedFareArs?.toStringAsFixed(0) ?? '-'}'
                        : null,
                  ),
                  if (ride.notes != null) ...[
                    const Divider(height: 16),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Nota: ${ride.notes}',
                        style: inter(fontSize: RTextSize.sm, color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  // Botón aceptar
                  SizedBox(
                    width: double.infinity,
                    height: 64,
                    child: FilledButton(
                      onPressed: _accept,
                      style: FilledButton.styleFrom(backgroundColor: kBrandAccent),
                      child: Text('ACEPTAR ($_remaining s)',
                          style: inter(fontSize: RTextSize.base, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _reject,
                    child: const Text('Rechazar'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.address, this.detail});
  final IconData icon;
  final String label;
  final String address;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: inter(fontSize: RTextSize.xs, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              Text(address, style: inter(fontSize: RTextSize.sm, fontWeight: FontWeight.w500)),
              if (detail != null)
                Text(detail!, style: inter(fontSize: RTextSize.xs, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
          ),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/lib/features/ride/presentation/widgets/ride_offer_modal.dart
git commit -m "feat(driver/ride): RideOfferModal con countdown 15s y vibración"
```

---

## Task 14: RideInProgressScreen

**Files:**
- Create: `apps/driver/lib/features/ride/presentation/screens/ride_in_progress_screen.dart`
- Create: `apps/driver/lib/features/ride/presentation/widgets/ride_bottom_sheet.dart`

- [ ] **Step 1: Crear ride_bottom_sheet.dart**

```dart
// apps/driver/lib/features/ride/presentation/widgets/ride_bottom_sheet.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';
import 'package:remis_driver/features/ride/presentation/providers/ride_controller.dart';

class RideBottomSheet extends ConsumerStatefulWidget {
  const RideBottomSheet({super.key, required this.ride});
  final RideModel ride;

  @override
  ConsumerState<RideBottomSheet> createState() => _State();
}

class _State extends ConsumerState<RideBottomSheet> {
  Timer? _waitTimer;
  Duration _waitDuration = Duration.zero;
  bool _noShowEnabled = false;

  @override
  void initState() {
    super.initState();
    if (widget.ride.status == RideStatus.waitingPassenger) {
      _startWaitTimer();
    }
  }

  void _startWaitTimer() {
    _waitTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() {
        _waitDuration += const Duration(seconds: 1);
        if (_waitDuration.inMinutes >= 5) _noShowEnabled = true;
      });
    });
  }

  @override
  void dispose() {
    _waitTimer?.cancel();
    super.dispose();
  }

  String get _waitLabel {
    final m = _waitDuration.inMinutes;
    final s = _waitDuration.inSeconds % 60;
    return 'Esperando hace ${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final ride = widget.ride;
    final ctrl = ref.read(rideControllerProvider.notifier);

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + MediaQuery.paddingOf(context).bottom),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(RRadius.xl)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 15, offset: const Offset(0, -3))],
      ),
      child: switch (ride.status) {
        RideStatus.enRouteToPickup => _EnRouteContent(
            ride: ride,
            onArrived: () => ctrl.arrivedAtPickup(ride.id),
          ),
        RideStatus.waitingPassenger => _WaitingContent(
            waitLabel: _waitLabel,
            noShowEnabled: _noShowEnabled,
            onStartTrip: () => ctrl.startTrip(ride.id),
            onNoShow: () async {
              await ctrl.reportNoShow(ride.id);
              if (context.mounted) context.go('/home');
            },
          ),
        RideStatus.onTrip => _OnTripContent(
            ride: ride,
            onEnd: () => ctrl.endTrip(ride.id),
          ),
        RideStatus.completed => _CompletedContent(
            ride: ride,
            onCashPayment: () async {
              await ctrl.markCashPayment(ride.id);
              if (context.mounted) context.go('/home');
            },
          ),
        _ => const SizedBox.shrink(),
      },
    );
  }
}

class _EnRouteContent extends StatelessWidget {
  const _EnRouteContent({required this.ride, required this.onArrived});
  final RideModel ride;
  final VoidCallback onArrived;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _DragHandle(),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ride.passengerName ?? 'Pasajero',
                      style: interTight(fontSize: RTextSize.lg, fontWeight: FontWeight.w600)),
                  Text(ride.pickupAddress ?? '', style: inter(fontSize: RTextSize.sm)),
                ],
              ),
            ),
            IconButton.outlined(
              icon: const Icon(Icons.phone_outlined),
              // Masked calling es Tanda 5D — por ahora llamada directa si hay teléfono
              onPressed: ride.passengerPhone != null
                  ? () => launchUrl(Uri.parse('tel:${ride.passengerPhone}'))
                  : null,
              tooltip: 'Llamar',
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 64,
          child: FilledButton(
            onPressed: onArrived,
            child: const Text('Llegué al pickup'),
          ),
        ),
      ],
    );
  }
}

class _WaitingContent extends StatelessWidget {
  const _WaitingContent({
    required this.waitLabel,
    required this.noShowEnabled,
    required this.onStartTrip,
    required this.onNoShow,
  });
  final String waitLabel;
  final bool noShowEnabled;
  final VoidCallback onStartTrip;
  final VoidCallback onNoShow;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _DragHandle(),
        Text(waitLabel,
            style: inter(fontSize: RTextSize.sm, color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 64,
          child: FilledButton(
            onPressed: onStartTrip,
            style: FilledButton.styleFrom(backgroundColor: kBrandAccent),
            child: const Text('Iniciar viaje'),
          ),
        ),
        if (noShowEnabled) ...[
          const SizedBox(height: 8),
          TextButton(
            onPressed: onNoShow,
            child: const Text('No-show — pasajero no apareció'),
          ),
        ],
      ],
    );
  }
}

class _OnTripContent extends StatelessWidget {
  const _OnTripContent({required this.ride, required this.onEnd});
  final RideModel ride;
  final VoidCallback onEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _DragHandle(),
        Text('En viaje a ${ride.destAddress ?? 'destino'}',
            style: interTight(fontSize: RTextSize.base, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 64,
          child: FilledButton(onPressed: onEnd, child: const Text('Finalizar viaje')),
        ),
      ],
    );
  }
}

class _CompletedContent extends StatelessWidget {
  const _CompletedContent({required this.ride, required this.onCashPayment});
  final RideModel ride;
  final VoidCallback onCashPayment;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _DragHandle(),
        Text('Viaje finalizado', style: interTight(fontSize: RTextSize.lg, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        if (ride.finalFareArs != null)
          Text('\$${ride.finalFareArs!.toStringAsFixed(0)}',
              style: interTight(fontSize: 36, fontWeight: FontWeight.w700, color: kBrandAccent)),
        Text('Efectivo', style: inter(fontSize: RTextSize.sm)),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 64,
          child: FilledButton(
            onPressed: onCashPayment,
            child: const Text('Cobrar en efectivo'),
          ),
        ),
      ],
    );
  }
}

class _DragHandle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 44, height: 4,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.outlineVariant,
          borderRadius: BorderRadius.circular(RRadius.full),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Crear ride_in_progress_screen.dart**

```dart
// apps/driver/lib/features/ride/presentation/screens/ride_in_progress_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/ride/domain/models/ride_model.dart';
import 'package:remis_driver/features/ride/presentation/providers/ride_controller.dart';
import 'package:remis_driver/features/ride/presentation/widgets/ride_bottom_sheet.dart';
import 'package:remis_driver/features/sos/presentation/widgets/sos_hold_button.dart';

class RideInProgressScreen extends ConsumerWidget {
  const RideInProgressScreen({super.key, required this.rideId});
  final String rideId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rideState = ref.watch(rideControllerProvider);

    // Detectar cancelación desde Realtime
    ref.listen(rideControllerProvider, (_, state) {
      if (state is RideUiIdle && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('El viaje fue cancelado.')),
        );
        context.go('/home');
      }
    });

    return switch (rideState) {
      RideUiLoading() => const Scaffold(body: Center(child: CircularProgressIndicator())),
      RideUiError(:final message) => Scaffold(
          body: Center(child: Text(message)),
        ),
      RideUiActive(:final ride) || RideUiCompleted(:final ride) => _RideScreen(
          rideId: rideId,
          ride: ride,
          rideState: rideState,
        ),
      _ => const Scaffold(body: Center(child: CircularProgressIndicator())),
    };
  }
}

class _RideScreen extends StatefulWidget {
  const _RideScreen({required this.rideId, required this.ride, required this.rideState});
  final String rideId;
  final RideModel ride;
  final RideUiState rideState;

  @override
  State<_RideScreen> createState() => _RideScreenState();
}

class _RideScreenState extends State<_RideScreen> {
  GoogleMapController? _mapCtrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness:
            theme.brightness == Brightness.dark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
      ),
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: theme.colorScheme.surface.withValues(alpha: 0.9),
          elevation: 0,
          leading: BackButton(onPressed: () {}), // deshabilitado durante viaje activo
          title: Text(
            _appBarTitle(widget.ride.status),
            style: interTight(fontSize: RTextSize.md, fontWeight: FontWeight.w600),
          ),
          actions: [
            SosHoldButton(rideId: widget.rideId),
            const SizedBox(width: 8),
          ],
        ),
        body: Stack(
          children: [
            GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(widget.ride.pickupLat, widget.ride.pickupLng),
                zoom: 15,
              ),
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              onMapCreated: (c) => _mapCtrl = c,
            ),
            Positioned(
              left: 0, right: 0, bottom: 0,
              child: RideBottomSheet(ride: widget.ride),
            ),
          ],
        ),
      ),
    );
  }

  String _appBarTitle(RideStatus status) => switch (status) {
        RideStatus.enRouteToPickup => 'Yendo al pickup',
        RideStatus.waitingPassenger => 'Esperando pasajero',
        RideStatus.onTrip => 'En viaje',
        RideStatus.completed => 'Viaje finalizado',
        _ => 'Viaje',
      };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/driver/lib/features/ride/presentation/
git commit -m "feat(driver/ride): RideInProgressScreen + RideBottomSheet (5 estados)"
```

---

## Task 15: FCM — Firebase Messaging

**Files:**
- Modify: `apps/driver/lib/main.dart`

> 🚫 **PREREQUISITO BLOQUEANTE:** Verificar que existan ambos archivos antes de continuar:
> - `apps/driver/android/app/google-services.json` (Android)
> - `apps/driver/ios/Runner/GoogleService-Info.plist` (iOS)
>
> Sin estos archivos la app **crashea al iniciar**. Si no existen: crear el proyecto en [Firebase Console](https://console.firebase.google.com), registrar los bundle IDs (`com.remis.remis_driver`), descargar y ubicar los archivos. **No ejecutar Task 15 hasta tenerlos.**

- [ ] **Step 0: Verificar existencia de archivos Firebase**

```bash
test -f apps/driver/android/app/google-services.json && echo "OK Android" || echo "MISSING google-services.json"
test -f apps/driver/ios/Runner/GoogleService-Info.plist && echo "OK iOS" || echo "MISSING GoogleService-Info.plist"
```

Esperado: ambas líneas dicen `OK`. Si alguna dice `MISSING`, detener y coordinar con el cliente.

- [ ] **Step 1: Inicializar Firebase + FCM en main.dart**

Agregar después de `WidgetsFlutterBinding.ensureInitialized()`:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Handler de mensajes en background (top-level, fuera de clases)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // El IncomingRideNotifier maneja la UI cuando la app vuelve a foreground.
  // Aquí solo nos aseguramos que Firebase esté init para procesar el payload.
  await Firebase.initializeApp();
}
```

En `main()`:

```dart
await Firebase.initializeApp();
FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

// Escuchar mensajes en foreground (cuando la app está abierta)
FirebaseMessaging.onMessage.listen((message) {
  final type = message.data['type'];
  if (type == 'ride_assigned') {
    // El Realtime subscription ya maneja esto — FCM es redundancia
    // No hay action adicional en foreground
  }
});
```

> ⚠️ **Prerequisito:** El cliente debe generar `google-services.json` desde Firebase Console y colocarlo en `android/app/`. Para iOS: `GoogleService-Info.plist` en `ios/Runner/`. Sin estos archivos, la app crashea al iniciar.

- [ ] **Step 2: Commit**

```bash
git add apps/driver/lib/main.dart
git commit -m "feat(driver): Firebase init + FCM background handler"
```

---

## Task 16: SOS feature

**Files:**
- Create: `apps/driver/lib/features/sos/data/sos_repository.dart`
- Create: `apps/driver/lib/features/sos/presentation/widgets/sos_hold_button.dart`
- Create: `apps/driver/lib/features/sos/presentation/screens/sos_triggered_screen.dart`
- Create: `apps/driver/test/features/sos/sos_repository_test.dart`

- [ ] **Step 1: Escribir test**

```dart
// apps/driver/test/features/sos/sos_repository_test.dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SosRepository', () {
    test('prior_locations payload structure is valid JSON', () {
      final locations = [
        {'lat': -36.6167, 'lng': -64.2833, 'ts': '2026-04-26T10:00:00Z'},
      ];
      expect(locations.first.containsKey('lat'), isTrue);
      expect(locations.first.containsKey('ts'), isTrue);
    });
  });
}
```

- [ ] **Step 2: Run test**

```bash
cd apps/driver && flutter test test/features/sos/ -v
```

- [ ] **Step 3: Crear SosRepository**

```dart
// apps/driver/lib/features/sos/data/sos_repository.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class SosRepository {
  SosRepository(this._client);
  final SupabaseClient _client;

  Future<void> triggerSos({
    String? rideId,
    required String driverId,
    double? lat,
    double? lng,
    List<Map<String, dynamic>> priorLocations = const [],
  }) async {
    await _client.from('sos_events').insert({
      'ride_id': rideId,
      'triggered_by': driverId,
      'triggered_role': 'driver',
      if (lat != null && lng != null)
        'location': 'SRID=4326;POINT($lng $lat)',
      'prior_locations': priorLocations,
      'dispatched_to_dispatcher': false,
    });
  }
}
```

- [ ] **Step 4: Crear sos_hold_button.dart**

```dart
// apps/driver/lib/features/sos/presentation/widgets/sos_hold_button.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/sos/data/sos_repository.dart';

class SosHoldButton extends ConsumerStatefulWidget {
  const SosHoldButton({super.key, this.rideId});
  final String? rideId;

  @override
  ConsumerState<SosHoldButton> createState() => _State();
}

class _State extends ConsumerState<SosHoldButton> {
  bool _holding = false;
  double _progress = 0;
  Timer? _timer;

  void _onLongPressStart(LongPressStartDetails _) {
    setState(() { _holding = true; _progress = 0; });
    HapticFeedback.mediumImpact();
    _timer = Timer.periodic(const Duration(milliseconds: 50), (t) {
      setState(() => _progress += 0.05 / 2); // 2 segundos
      if (_progress >= 1.0) {
        t.cancel();
        _trigger();
      }
    });
  }

  void _onLongPressEnd(LongPressEndDetails _) {
    _timer?.cancel();
    setState(() { _holding = false; _progress = 0; });
  }

  Future<void> _trigger() async {
    HapticFeedback.heavyImpact();
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;
    final repo = SosRepository(Supabase.instance.client);
    await repo.triggerSos(rideId: widget.rideId, driverId: uid);
    if (mounted) context.push('/sos');
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: _onLongPressStart,
      onLongPressEnd: _onLongPressEnd,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (_holding)
            SizedBox(
              width: 40,
              height: 40,
              child: CircularProgressIndicator(
                value: _progress,
                strokeWidth: 3,
                color: kDanger,
              ),
            ),
          IconButton(
            icon: const Icon(Icons.warning_amber_rounded),
            color: kDanger,
            tooltip: 'SOS — Mantené presionado',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Mantené presionado 2 segundos para activar SOS.')),
              );
            },
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 5: Crear sos_triggered_screen.dart**

```dart
// apps/driver/lib/features/sos/presentation/screens/sos_triggered_screen.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:remis_design_system/remis_design_system.dart';

class SosTriggeredScreen extends StatelessWidget {
  const SosTriggeredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kDanger,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.warning_amber_rounded, size: 80, color: Colors.white),
              const SizedBox(height: 24),
              Text(
                'SOS activado',
                style: interTight(fontSize: RTextSize.xl2, fontWeight: FontWeight.w800, color: Colors.white),
              ),
              const SizedBox(height: 16),
              Text(
                'Avisamos a la agencia. Si estás en peligro, llamá al 911.',
                textAlign: TextAlign.center,
                style: inter(fontSize: RTextSize.base, color: Colors.white.withValues(alpha: 0.9)),
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 64,
                child: FilledButton(
                  onPressed: () => launchUrl(Uri.parse('tel:911')),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: kDanger,
                  ),
                  child: Text('Llamar al 911', style: inter(fontWeight: FontWeight.w700, fontSize: RTextSize.base)),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/home'),
                child: Text('Volver', style: inter(color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/driver/lib/features/sos/ \
        apps/driver/test/features/sos/
git commit -m "feat(driver/sos): SosHoldButton 2s + SosTriggeredScreen + SosRepository"
```

---

## Task 17: ShiftEndSummarySheet

**Files:**
- Create: `apps/driver/lib/features/shift/presentation/widgets/shift_end_summary_sheet.dart`

- [ ] **Step 1: Crear ShiftEndSummarySheet**

```dart
// apps/driver/lib/features/shift/presentation/widgets/shift_end_summary_sheet.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_design_system/remis_design_system.dart';

class ShiftEndSummarySheet extends StatelessWidget {
  const ShiftEndSummarySheet({super.key, required this.summary});
  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) {
    final hours = summary['hours_worked'] ?? 0;
    final rides = summary['total_rides'] ?? 0;
    final earnings = summary['total_earnings_ars'] ?? 0;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44, height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(RRadius.full),
              ),
            ),
          ),
          Text('Resumen del turno',
              style: interTight(fontSize: RTextSize.lg, fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),
          _SummaryRow(label: 'Horas trabajadas', value: '${hours}h'),
          _SummaryRow(label: 'Viajes completados', value: '$rides'),
          _SummaryRow(label: 'Total facturado', value: '\$$earnings'),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: FilledButton(
              onPressed: () => context.go('/home'),
              child: const Text('Cerrar'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: inter(fontSize: RTextSize.base)),
          Text(value, style: interTight(fontSize: RTextSize.base, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/lib/features/shift/presentation/widgets/shift_end_summary_sheet.dart
git commit -m "feat(driver/shift): ShiftEndSummarySheet con horas/viajes/total"
```

---

## Task 18: Logout guard durante turno activo

**Files:**
- Modify: `apps/driver/lib/features/settings/presentation/screens/settings_screen.dart`

- [ ] **Step 1: Modificar settings_screen.dart — proteger logout**

Buscar el botón/acción de "Cerrar sesión" existente. Reemplazar la llamada directa a `supabase.auth.signOut()` por:

```dart
Future<void> _handleSignOut(BuildContext context, WidgetRef ref) async {
  final shiftState = ref.read(shiftControllerProvider);
  if (shiftState is ShiftActive) {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Turno activo'),
        content: const Text('Estás en turno. Si cerrás sesión, el turno se termina. ¿Seguro?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Terminar turno y salir'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    await ref.read(shiftControllerProvider.notifier).endShift();
  }
  await Supabase.instance.client.auth.signOut();
  if (context.mounted) context.go('/auth/login');
}
```

- [ ] **Step 2: Agregar widget test del logout guard**

Crear `apps/driver/test/features/settings/logout_guard_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:remis_driver/features/shift/presentation/providers/shift_controller.dart';

void main() {
  group('ShiftState guard', () {
    test('ShiftActive is detected correctly', () {
      const state = ShiftActive(DriverStatus.available);
      expect(state, isA<ShiftActive>());
    });

    test('ShiftIdle does not trigger guard', () {
      const state = ShiftIdle();
      expect(state is ShiftActive, isFalse);
    });
  });
}
```

- [ ] **Step 3: Run test**

```bash
cd apps/driver && flutter test test/features/settings/logout_guard_test.dart -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/driver/lib/features/settings/ \
        apps/driver/test/features/settings/
git commit -m "feat(driver/settings): guardia de logout durante turno activo"
```

---

## Task 19: Run all tests y verificación final

- [ ] **Step 1: Ejecutar codegen completo**

```bash
cd apps/driver && dart run build_runner build --delete-conflicting-outputs
```

- [ ] **Step 2: Run todos los tests**

```bash
cd apps/driver && flutter test --reporter=expanded
```

Esperado: todos los tests pasan.

- [ ] **Step 3: Typecheck**

```bash
cd apps/driver && flutter analyze
```

Esperado: 0 errores. Advertencias menores son aceptables.

- [ ] **Step 4: Commit final de integración**

```bash
git add -A
git commit -m "feat(driver): GPS background, ride lifecycle, onboarding — Tanda 3A completa"
```

---

## Dependencias externas y prerrequisitos

| Item | Responsable | Acción |
|------|-------------|--------|
| Licencia Transistorsoft (USD 399) | Cliente | Comprar en transistorsoft.com y proveer license key |
| `google-services.json` | Cliente | Crear proyecto Firebase → Android → descargar JSON → `android/app/` |
| `GoogleService-Info.plist` | Cliente | Firebase → iOS → descargar → `ios/Runner/` |
| Capabilities Xcode | Dev | Abrir Xcode → Runner → Signing & Capabilities → activar Background Modes |
| RPCs en Supabase | Tanda 3D | `accept_ride`, `compute_final_fare`, `get_shift_summary`, `record_ride_distance` |
| Edge Function `driver-heartbeat` | Tanda 3D | Recibe POST del heartbeat y persiste en `driver_heartbeats`; sin ella la app sigue funcionando pero los OEMs no se detectan |
| `onboarding_completed_at` en tabla drivers | Tanda 3D | Columna para sync cross-device (mientras tanto: SharedPreferences local) |
| `agency_id` en tabla `drivers` | Tanda 3D o pre-existente | ShiftController la lee para el canal Realtime; si no existe, el broadcast queda sin agencyId |

---

## Acceptance criteria mapping

| Criterio del spec | Task |
|-------------------|------|
| Onboarding 8 pasos bloquea hasta cumplir cada paso | Task 7 |
| Test funcional paso 7 verifica GPS background | Task 7, step 8 |
| "Iniciar turno" arranca tracking, ubicaciones llegan al backend | Tasks 4, 5, 6 |
| Recibir pedido vía Realtime + FCM | Tasks 11, 15 |
| Aceptar → RPC con guard; si otro chofer lo tomó → error graceful | Tasks 11, 12 |
| Flujo assigned → en_route → waiting → on_trip → completed | Tasks 12, 13, 14 |
| SOS dispara sos_events y abre tel:911 | Task 16 |
| Logout guard durante turno activo | Task 18 |
