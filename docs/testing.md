# Guía de Testing — remis_app

## Resumen de la suite

| Nivel | Herramienta | Dónde | Cuándo corre |
|-------|------------|-------|--------------|
| SQL / RLS | pgTAP | supabase/tests/ | PR + merge |
| Unit tests Flutter | flutter test | apps/*/test/ | PR + merge |
| Widget tests Flutter | flutter test | apps/*/test/widgets/ | PR + merge |
| E2E dispatcher | Playwright | apps/dispatcher/tests/e2e/ | Nightly |
| Integration Flutter | flutter test integration_test/ | apps/*/integration_test/ | Nightly |
| Golden tests | flutter test --tags golden | apps/*/test/golden/ | Nightly |

## Cómo correr los tests localmente

### pgTAP (tests SQL)
```bash
supabase start
supabase db test
```

### Flutter — tests rápidos
```bash
cd apps/driver
flutter test

cd apps/passenger
flutter test
```

### Flutter — con coverage
```bash
flutter test --coverage
# Genera: coverage/lcov.info
# Ver en browser: genhtml coverage/lcov.info -o coverage/html && open coverage/html/index.html
```

### Flutter — golden tests
```bash
# Actualizar goldens (solo cuando cambia UI intencionalmente)
flutter test --update-goldens

# Verificar goldens existentes
flutter test --tags golden
```

### Playwright E2E (dispatcher)
```bash
# Setup una vez
cd apps/dispatcher
npx playwright install chromium

# Correr tests
pnpm test:e2e

# Correr en modo UI (debug)
pnpm test:e2e:ui
```

### Flutter integration tests
```bash
# Requiere emulador/device conectado y Supabase local corriendo
supabase start
cd apps/driver
flutter test integration_test/ --tags e2e
```

## Agregar un test nuevo

### Unit test Flutter
1. Crear en `test/features/<feature>/domain/<nombre>_test.dart`
2. Naming: `featureName_scenario_expectedResult_test.dart`
3. Importar solo el código bajo test, no Supabase ni Flutter
4. Usar `group()` para agrupar por clase/función

### Widget test Flutter
1. Crear en `test/widgets/<nombre>_test.dart`
2. Usar `pumpRiverpodWidget()` de `test/test_utils/pump_widget.dart`
3. Mockear Supabase y repositories con `mocktail`
4. Evitar `pumpAndSettle()` para animaciones infinitas — usar `pump(Duration(...))`

### Test pgTAP
1. Crear archivo en `supabase/tests/` con prefijo numérico
2. Siempre: `begin; select plan(N); ... select * from finish(); rollback;`
3. Para tests de RLS: `set local role authenticated; set local "request.jwt.claims" = '...'`

## Convenciones de naming

- Dart: `featureName_scenario_expectedResult_test.dart`
  - Ej: `ride_status_fromString_throwsOnUnknown_test.dart`
- SQL: `NN_descripción.sql` donde NN es número de orden
- Playwright: `feature.spec.ts`

## Qué NO testear

- Getters/setters triviales
- Código generado (`.g.dart`, `.freezed.dart`)
- Boilerplate de Riverpod (los `@riverpod` providers)
- Comportamiento de librerías externas (Flutter, Supabase SDK)

## Thresholds de coverage

| Capa | Mínimo |
|------|--------|
| domain/, usecases/ | 70% |
| presentation/ | 30% |
| Total | 50% |

## Tests flaky

Si un test falla 1 de cada 10 corridas: **arreglarlo o eliminarlo**. No usar `retry: 5` para esconder el problema.

Causas comunes de flakiness:
- `await tester.pumpAndSettle()` con animaciones infinitas → usar `pump(Duration(...))`
- Timing en realtime subscriptions → usar `testWidgets` con fake timers
- Race conditions en pgTAP → usar `begin/rollback` siempre

## Mocking

### Supabase en Flutter
Usar `mocktail` para mockear el cliente:
```dart
class MockSupabaseClient extends Mock implements SupabaseClient {}
```

### Google Maps en widget tests
Mockear `GoogleMap` con un widget vacío:
```dart
// En test setup
TestWidgetsFlutterBinding.ensureInitialized();
// Maps no renderiza en tests — ignorar MissingPluginException
```

## Factories de test data

Usar las factories en `test/factories/` para crear datos de prueba con defaults sensatos:
```dart
final ride = RideFactory.requested();
final assignedRide = RideFactory.assigned(driverId: 'driver-abc');
```
