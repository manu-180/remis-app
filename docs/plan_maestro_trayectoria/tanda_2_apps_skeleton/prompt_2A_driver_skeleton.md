# Prompt 2A — Driver app: skeleton Flutter

> **LEÉ:** `00_design_language.md` (sec 9 driver layout, 11 voz), `00_arquitectura.md` (sec 1, 3 capas Flutter), `00_file_ownership_matrix.md`.

## Objetivo

Dejar la app del conductor booteable: arranca, muestra splash, va a login (teléfono + OTP), entra al home con mapa stub fullscreen + bottom card de estado. Cero lógica de GPS o pedidos — solo el chasis.

**Premium check:** las 5 pantallas existentes deben sentirse premium ya en este punto (transiciones, micro-interacciones del DS, tipografía exacta, modo oscuro respetando el sistema). Si parece "demo techie" hay que ajustar.

## File ownership

✍️ `apps/driver/**` + zonas declaradas en `flutter-core` (`auth/`, `supabase_client/`, `result/`, `errors/`, `logger/`, `env/`).

## Steps

### 1. `flutter create apps/driver --org com.[cliente].remis`

Configurar `pubspec.yaml`:

```yaml
name: remis_driver
description: App del conductor de remís
publish_to: none
version: 0.1.0+1

environment:
  sdk: ^3.5.0
  flutter: ^3.27.0

dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.0
  riverpod_annotation: ^2.6.0
  go_router: ^14.6.0
  supabase_flutter: ^2.8.0
  google_maps_flutter: ^2.10.0
  flutter_dotenv: ^5.2.1
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0
  device_info_plus: ^11.2.0
  package_info_plus: ^8.1.0
  permission_handler: ^11.3.1
  remis_design_system:
    path: ../../packages/design-system/flutter
  remis_flutter_core:
    path: ../../packages/flutter-core

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.13
  riverpod_generator: ^2.6.0
  freezed: ^2.5.7
  json_serializable: ^6.9.0
  flutter_lints: ^5.0.0
  custom_lint: ^0.7.0
  riverpod_lint: ^2.6.0
```

`analysis_options.yaml`:
- Incluir `flutter_lints` + `custom_lint` con `riverpod_lint`.
- `prefer_single_quotes: true`, `avoid_print: error`, `unawaited_futures: error`.

### 2. Estructura inicial

```
apps/driver/lib/
├── main.dart
├── app.dart
├── core/
│   ├── env/env.dart                # lee --dart-define
│   ├── routing/app_router.dart     # go_router
│   ├── theme/theme_controller.dart # light/dark/system
│   └── observability/              # placeholder, Tanda 5A llena
├── features/
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── splash_screen.dart
│   │       │   ├── phone_login_screen.dart
│   │       │   └── otp_verify_screen.dart
│   │       └── providers/auth_controller.dart
│   ├── home/
│   │   └── presentation/
│   │       └── screens/home_screen.dart
│   └── settings/
│       └── presentation/
│           └── screens/settings_screen.dart
└── shared/
    └── widgets/                    # widgets propios del driver
```

### 3. `main.dart` y `app.dart`

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Env.load();
  await Supabase.initialize(url: Env.supabaseUrl, anonKey: Env.supabaseAnonKey);
  runApp(const ProviderScope(child: DriverApp()));
}
```

`DriverApp` consume `themeControllerProvider` para light/dark/system. Aplica `buildLightTheme()` / `buildDarkTheme()` del DS. Usa `MaterialApp.router` con `app_router.dart`.

**SystemChrome:** edge-to-edge, status bar transparente, navigation bar contextual (oscura en home con mapa, clara en settings).

### 4. go_router

```dart
final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (ctx, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isAuth = state.fullPath?.startsWith('/auth') ?? false;
    if (state.fullPath == '/splash') return null;
    if (session == null && !isAuth) return '/auth/login';
    if (session != null && isAuth) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/auth/login', builder: (_, __) => const PhoneLoginScreen()),
    GoRoute(path: '/auth/otp', builder: (_, s) => OtpVerifyScreen(phone: s.uri.queryParameters['phone']!)),
    GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
  ],
);
```

### 5. SplashScreen — premium

- Fondo `--brand-primary` fullscreen.
- Logo placeholder centrado (texto "[NOMBRE] Driver" en Inter Tight 600 32px blanco — reemplazable).
- **NO** spinner inicial. Después de 800ms si no resolvió → indicador minimalista (3 puntos pulsantes, no progress).
- Decisión de routing en background: lee session, hace check de versión mínima (placeholder), redirige.
- Transición a la siguiente pantalla con fade 240ms.

**Anti-pattern explícito a evitar:** auto animado moviéndose en el splash. NO.

### 6. PhoneLoginScreen — premium

Layout:
```
┌─────────────────────────────────┐
│  [back]                         │
│                                 │
│  Hola.                          │ ← Inter Tight 700 36px
│  Ingresá tu teléfono.           │ ← Inter 400 18px neutral-600
│                                 │
│  ┌─────────────────────────┐   │
│  │ +54  [9 2954 XXX XXX]   │   │ ← input con prefix +54, formato AR
│  └─────────────────────────┘   │
│                                 │
│  Te vamos a mandar un código    │ ← caption neutral-500
│  por SMS.                       │
│                                 │
│  ┌─────────────────────────┐   │
│  │       Continuar         │   │ ← RButton.primary lg full
│  └─────────────────────────┘   │
│                                 │
│  ¿Problemas? Llamanos al        │ ← link neutral-600
│  02954-XXX-XXX                  │
└─────────────────────────────────┘
```

Detalles:
- Padding lateral 24, top 48 después del back.
- `RInput` con prefix fijo "+54" + formato auto AR (los 9 al inicio para móvil + máscara).
- Validación: regex AR mobile (`^9\d{10}$` después del +54).
- Loading state del botón al enviar OTP.
- Error toast si falla.
- Auto-focus del input al entrar.

Lógica:
- `signInWithOtp(phone: '+549...', shouldCreateUser: false)` (sólo deja entrar conductores ya pre-registrados).
- En éxito → `go('/auth/otp?phone=...')`.
- Manejo de errores con `Result<void, AuthError>` (definido en `flutter-core/auth`).

### 7. OtpVerifyScreen

- 6 inputs `pin_code_text_field` o custom — recomendado custom con `RInput` invisible + render visual de cuadritos para más control sobre tipografía y accesibilidad.
- Auto-paste, auto-jump entre cajas, paste-from-SMS (Android `SmsRetriever`).
- Countdown 60s para "Reenviar código" (botón disabled hasta 0).
- En éxito: `verifyOTP(phone, token)` → session creada → redirect a `/home`.

### 8. HomeScreen — placeholder estructural premium

Ya quiero ver el chasis del flujo "turno activo", incluso sin lógica:

```
Stack:
- GoogleMap fullscreen (showMyLocationButton: false, zoomControls off, defaultLatLng: La Pampa centro)
- Translucent AppBar arriba: hamburger + título "Esperando turno" + SOS button placeholder
- BottomSheet collapsed (h120): RDriverStatusPill "Offline" + RButton "Iniciar turno" full width
- FAB esquina inferior derecha (con safe area): centrar mi ubicación
```

`Iniciar turno` por ahora solo cambia el state local + label cambia a "Disponible" pill verde + bottom button cambia a "Pausar". Tanda 3 conecta esto a la realidad.

### 9. SettingsScreen

Lista vertical con secciones:
- **Perfil**: foto, nombre, teléfono (no editable acá).
- **Vehículo**: móvil + patente (read-only, edita admin).
- **Documentos**: lista con vencimiento (placeholder).
- **App**:
  - Modo de tema (light / dark / system) — toggle real con `themeControllerProvider`.
  - Notificaciones (placeholder).
  - Idioma (solo "Español" por ahora).
- **Sobre**: versión, link a TyC + Privacidad (webview placeholder).
- **Cerrar sesión** (botón destructivo abajo).

### 10. flutter-core packages que 2A escribe

#### `packages/flutter-core/lib/auth/`

- `auth_controller.dart` (provider Riverpod expone `Stream<AuthState>`).
- `auth_repository.dart` (interface + impl Supabase).
- `auth_errors.dart` (sealed class con casos: invalidPhone, invalidOtp, networkError, unknown).

#### `packages/flutter-core/lib/supabase_client/`

- `supabase_client_provider.dart` — singleton con `Supabase.instance.client`.
- Helpers: `userIdProvider`, `sessionProvider`.

#### `packages/flutter-core/lib/result/`

```dart
sealed class Result<T, E> {
  const Result();
  factory Result.ok(T value) = Ok<T, E>;
  factory Result.err(E error) = Err<T, E>;
  // map, flatMap, fold, etc.
}
final class Ok<T, E> extends Result<T, E> { final T value; const Ok(this.value); }
final class Err<T, E> extends Result<T, E> { final E error; const Err(this.error); }
```

#### `packages/flutter-core/lib/errors/`

`AppError` sealed class con casos: `Network`, `Auth`, `Permission`, `Validation`, `Domain(message)`, `Unknown(cause)`. Cada uno con `userMessage()` que devuelve copy en español accionable.

#### `packages/flutter-core/lib/logger/`

Wrapper minimal sobre `developer.log` con tags. Tanda 5A lo conecta a Sentry.

#### `packages/flutter-core/lib/env/`

Carga `--dart-define-from-file` con env por flavor: `env/dev.json`, `env/stg.json`, `env/prd.json`. Crear los 3 con placeholders.

### 11. Android setup

`AndroidManifest.xml`:
- Permisos por ahora: `INTERNET`, `ACCESS_NETWORK_STATE`. (Location y FCM en Tanda 3.)
- Tema launch acorde a splash.
- Edge-to-edge.

`build.gradle`:
- minSdk 24 (Android 7).
- targetSdk 35.
- Configurar Google Maps API key vía env.

### 12. iOS setup

`Info.plist`:
- `LSApplicationQueriesSchemes` para `tel`, `whatsapp`.
- Display name "[NOMBRE] Driver".
- Configurar Google Maps API key.

Bundle ID: `com.[cliente].remis.driver`.

### 13. Premium polish del skeleton

Aunque sea skeleton, aplicar:
- **Splash → Login**: fade 240ms `--ease-out`.
- **Login → OTP**: slide horizontal 240ms.
- **OTP → Home**: fade-in con escala 0.98 → 1.0 280ms (sensación de "aterrizar").
- **Tap haptics**: `LightImpact` en CTAs principales.
- **Estados de loading**: skeleton (RSkeletonLoader del DS) en SettingsScreen, NO spinners.
- **Status bar overlay** correcto en HomeScreen (sobre mapa: dark icons en day, light en night).

### 14. Mock data hooks

Para que la app levante sin Supabase real, env `dev` puede apuntar a un Supabase local. Si no se levantó local, manejar el error en SplashScreen mostrando "No hay conexión — verificá Supabase local" en vez de crashear.

## Acceptance criteria

- [ ] `flutter run` levanta la app en Android e iOS.
- [ ] Login flow funciona contra Supabase local (con un user de seed).
- [ ] Las 5 pantallas se navegan sin error.
- [ ] Modo light + dark se ve correcto en las 5 pantallas.
- [ ] `flutter analyze` sin warnings.
- [ ] `flutter pub run build_runner build` corre sin errores.
- [ ] Commit `feat(driver): bootable skeleton with auth and home placeholder`.

## Out of scope (Tanda 3+)

- GPS background.
- Recibir / aceptar pedidos.
- Pantalla de viaje en curso.
- FCM.
- KYC.

## Notas

- **Mantenete dentro del DS.** Si necesitás un widget que no existe, agregalo a `apps/driver/lib/shared/widgets/` (no contamines DS desde acá).
- **Al log out** se llama `Supabase.instance.client.auth.signOut()` y `go('/auth/login')`.
- **Splash duration mínimo:** no menos de 600ms (evita flash). Máximo 1500ms si el chequeo demora.
