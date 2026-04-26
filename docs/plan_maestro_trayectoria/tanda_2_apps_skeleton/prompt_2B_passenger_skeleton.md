# Prompt 2B — Passenger app: skeleton Flutter

> **LEÉ:** `00_design_language.md` (sec 9 passenger layout, 11 voz), `00_arquitectura.md` (sec 1, 3), `00_file_ownership_matrix.md`.

## Objetivo

App pasajero booteable: splash → login (teléfono + OTP) → home con mapa + bottom card "¿A dónde vamos?" (placeholder). Cero lógica de pedido — chasis premium funcional.

## File ownership

✍️ `apps/passenger/**` + zonas declaradas en `flutter-core` (`location_utils/`, `time_utils/`, `phone_utils/`, `currency_format/`).

**Coordinación con 2A:** `auth/` y `supabase_client/` los escribe 2A. Si al arrancar tu sesión 2A ya hizo merge, importás. Si no: implementás un mock interno en `apps/passenger/lib/core/mock_auth.dart` y migrás cuando 2A entregue (esto **no** rompe ownership).

## Steps

### 1. `flutter create apps/passenger --org com.[cliente].remis`

`pubspec.yaml`: igual a driver pero con foco en **rendimiento de mapa pasajero** + **flutter_custom_tabs** (para futuro MP).

Agregar:
```yaml
flutter_custom_tabs: ^2.4.0
flutter_typeahead: ^5.2.0       # autocomplete addresses
geolocator: ^13.0.2             # solo foreground (passenger no necesita background)
google_places_flutter: ^2.0.8
```

### 2. Estructura

```
apps/passenger/lib/
├── main.dart
├── app.dart
├── core/{env, routing, theme, observability}/
├── features/
│   ├── auth/                       # consume flutter-core/auth
│   ├── home/                       # mapa + "a dónde vamos"
│   ├── ride_request/               # placeholder Tanda 3
│   ├── tracking/                   # placeholder
│   ├── history/                    # placeholder
│   └── settings/
└── shared/widgets/
```

### 3. Splash + Login + OTP

Igual estructura que driver, **pero diferenciar visualmente**:
- Tono más cálido en copys: "Hola, ¿a dónde vamos hoy?"
- Splash con sutil ilustración de horizonte pampeano (placeholder SVG plano, será reemplazado en Tanda 4B).
- Flujo OTP idéntico.
- **Diferencia importante**: `signInWithOtp(shouldCreateUser: true)` — pasajeros pueden registrarse desde la app.

Después de OTP exitoso, pedir **nombre** (input simple, h44, único campo en pantalla, "¿Cómo te llamás?") + **acepto TyC + Privacidad** checkbox. Insert en `passengers` table vía RPC.

### 4. HomeScreen — premium

```
Stack:
- GoogleMap fullscreen, mi ubicación (Geolocator.getCurrentPosition con permission flow correcto)
- Pin pickup confirmable (drag o auto en mi ubic).
- Top bar translúcido: avatar (perfil) + nombre + ícono de historial.
- BottomSheet (3 stops):
  - collapsed h160:
    - card "¿A dónde vamos?" tap → expand
    - chips frecuentes: "Casa", "Trabajo" (mock por ahora)
  - half h360:
    - inputs origen + destino
    - sugeridos basados en `frequent_addresses` (mock)
  - full h720:
    - autocomplete completo Google Places + frecuentes
    - opciones: "Para ahora" / "Programar"
    - botón "Pedir remís" (disabled hasta tener destino)
```

Touch targets ≥44, type a `--text-base` mínimo. Animaciones de stops con `--ease-spring`.

### 5. Permission flow del pasajero

ANTES de pedir permiso del SO, pantalla "prominent disclosure":

```
🟦 ícono mapa pin (24px primary)

Tu ubicación

Necesitamos tu ubicación para
saber desde dónde te buscamos.

Solo la usamos cuando estás
pidiendo o haciendo un viaje.

[ Continuar ]
[ Ahora no ]
```

Si elige "Ahora no", la home muestra estado vacío con CTA "Activar ubicación" + permite ingresar dirección manualmente.

### 6. HistoryScreen (placeholder)

Lista vertical de últimos 20 viajes (mock data si no hay):
- Card: fecha + hora, origen → destino, importe, estado, acción (volver a pedir).
- Tap → detalle (placeholder).

### 7. SettingsScreen

Idéntico patrón a driver pero con:
- Métodos de pago (placeholder, Tanda 4D).
- Contactos de emergencia (placeholder, Tanda 5D).
- Idioma "Español".
- Sobre.
- Cerrar sesión.

### 8. flutter-core escrituras de 2B

#### `location_utils/`
- `permission_helper.dart` — pide permisos con prominent disclosure UI invocable como helper.
- `geolocator_provider.dart` — Riverpod provider que expone `Stream<Position>` cuando hay permiso.
- `bounds.dart` — utilidades de bounds + viewport del mapa.
- `address_format.dart` — formatear "Centenario 1234, Anguil" desde coords + label.

#### `time_utils/`
- `relative_time.dart` — "hace 5 min", "en 12 min", "ayer 14:30".
- `eta_format.dart` — "5 min", "1 h 12 min".

#### `phone_utils/`
- Validación AR.
- Format display "+54 9 2954 555 1234".
- Masking display: "***1234" (last 4).

#### `currency_format/`
- ARS format: "$1.234,56" (locale es-AR).
- Helper para inputs.

### 9. Tema y polish

Mismo patrón que driver. Diferencia clave: **passenger tiene más calidez** — en `theme.dart` (driver tiene su propio override en `app.dart` si es necesario) podés ajustar levemente el `ColorScheme.surface` para sentir más calidez (warm gray 1% más cálido). NO tocar el DS.

### 10. Android + iOS

- `AndroidManifest`: `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_FINE_LOCATION` (foreground), `ACCESS_COARSE_LOCATION`. (Background NO — pasajero no necesita.)
- `Info.plist`: `NSLocationWhenInUseUsageDescription` con copy en español.
- Bundle: `com.[cliente].remis.passenger`.

## Acceptance criteria

- [ ] App levanta en Android + iOS.
- [ ] Auth funciona contra Supabase local.
- [ ] HomeScreen muestra mapa + bottom sheet con 3 stops funcionales (sin lógica de pedido aún).
- [ ] Permission flow muestra prominent disclosure ANTES del prompt SO.
- [ ] Modo dark se ve coherente (mapa con `MapStyle` dark cuando system es dark).
- [ ] `flutter analyze` clean.
- [ ] Commit `feat(passenger): bootable skeleton with auth and home placeholder`.

## Out of scope

- Lógica de pedido real (Tanda 3B).
- Pago (Tanda 4D).
- Tracking del viaje (Tanda 3B).

## Notas

- **Permisos:** pasajero NO usa background. Si por error agregás `ACCESS_BACKGROUND_LOCATION`, las stores rechazan.
- **Mapa dark style:** `Style.mapStyle(MapStyle.dark)` o JSON style custom — preferir custom para coincidir con tokens.
- **Cards over map:** usar el blur/glass del DS sólo en el bottom card, NO en el top bar (mejor sólido translúcido sin blur — el mapa es muy denso visualmente y el blur cuesta GPU).
