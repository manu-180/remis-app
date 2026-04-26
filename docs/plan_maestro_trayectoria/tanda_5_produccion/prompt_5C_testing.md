# Prompt 5C — Testing: unit, widget, E2E, pgTAP

> **LEÉ:** `00_arquitectura.md` (sec 5 punto 7), `00_file_ownership_matrix.md` (Tanda 5C).

## Objetivo

Suite de tests viable y mantenible (no "100% coverage por compromiso"): unit para reglas de negocio puras, widget tests Flutter para componentes críticos, E2E Playwright para 5 flujos del dispatcher, pgTAP para RLS y funciones SQL críticas. **Lo que cubrimos NO se rompe en silencio.**

## File ownership

✍️ `apps/dispatcher/playwright.config.ts`, `apps/dispatcher/tests/**`, `apps/web/tests/**`, `apps/driver/test/**`, `apps/passenger/test/**`, `apps/*/integration_test/**`, `supabase/tests/**`, `docs/testing.md`.

## Filosofía

- **Tests rápidos en PR**: <3 min total.
- **Tests pesados en nightly**: golden tests, screenshot tests, visual regression.
- **Cubrir lo doloroso de bug**: lógica de tarifas, máquina de estados de ride, RLS, webhook MP, asignación con race condition.
- **NO testear**: getters/setters triviales, código generado (json_serializable, freezed), boilerplate de Riverpod.

## Steps

### 1. Tests SQL con pgTAP

`supabase/tests/`:

#### `01_rls_passengers.sql`
```sql
begin;
select plan(8);

-- setup: crear 2 pasajeros
insert into auth.users (id, phone) values
  ('11111111-1111-1111-1111-111111111111', '+5491234567890'),
  ('22222222-2222-2222-2222-222222222222', '+5491234567891');

-- pasajero A NO puede ver pasajero B
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(
  (select count(*) from passengers where id = '22222222-2222-2222-2222-222222222222')::int,
  0,
  'passenger A cannot see passenger B'
);

-- ... 7 más

select * from finish();
rollback;
```

Casos:
- Pasajero ve solo su row.
- Conductor no puede leer `passengers` directamente.
- Pasajero no puede insertar a `audit_log`.
- Dispatcher ve todos los rides.
- Anon NO puede leer `rides`.
- `assign_ride` falla con race (driver ya asignado).
- `cancel_ride` solo permitido en estados válidos.
- `get_shared_trip` con token expirado → empty.

#### `02_rpc_find_nearest.sql`

Setup con drivers en posiciones conocidas. Verifica:
- Devuelve los N más cercanos.
- Filtra `is_online=false`.
- Filtra GPS stale (>60s).
- Filtra por `vehicle_type` cuando se pasa.

#### `03_estimate_fare.sql`

- Sin matching zone → fallback a flat rate.
- Con zone match → aplica fare correcta.
- Recargo nocturno aplica entre 22:00-06:00.

#### `04_audit_chain.sql`

- Insertar 3 rows en `audit_log` (vía trigger).
- Verificar que `prev_hash` del row 2 = `row_hash` del row 1.
- Verificar que tampering del row 2 rompe la chain (recompute manual y check).

#### `05_partition_creation.sql`

- Llamar `create_next_month_partition()`.
- Verificar que existe la partition con el nombre esperado.
- Insertar row con fecha del próximo mes y verificar que cae en la partition correcta.

Run: `supabase db test`.

### 2. Unit tests Flutter — driver

Foco en lógica pura, no widgets:

`apps/driver/test/`:

#### `features/ride/domain/ride_state_machine_test.dart`
```dart
group('RideStateMachine', () {
  test('requested → assigned valid', () => expect(machine.canTransition(requested, assigned), true));
  test('completed → cancelled invalid', () => expect(machine.canTransition(completed, cancelled), false));
  test('all states reachable from requested', () { /*...*/ });
});
```

#### `features/shift/domain/turn_validator_test.dart`
- Doc vencido → bloquea `startShift`.
- Todos vigentes → permite.
- KYC pending → bloquea con razón.

#### `core/result/result_test.dart`
- map, flatMap, fold.

### 3. Widget tests Flutter — driver

`apps/driver/test/widgets/`:

#### `ride_offer_modal_test.dart`
- Render con datos mock.
- Tap "Aceptar" → callback se llama con ride_id correcto.
- Countdown 15s → al llegar a 0 dispara auto-reject.
- `pumpAndSettle` para animaciones.

#### `r_sos_button_test.dart`
- Hold-press 2s completo → callback dispara.
- Liberación temprana → callback NO dispara.
- Vibration mock recibe llamadas correctas.

#### Golden tests

`apps/driver/test/golden/`:
- Generar goldens del HomeScreen, RideOfferModal, OnboardingStep5 en light + dark.
- En CI corre solo `flutter test --tags golden` con `update-goldens` desactivado.
- Local `flutter test --update-goldens` para regenerar al cambiar UI.

### 4. Unit tests Flutter — passenger

#### `features/ride_request/domain/fare_estimator_test.dart`
- Estimación con factor 1.3 sobre distancia haversine.
- Recargo nocturno.
- Edge cases: misma posición → 0, sin destination → null.

#### `features/payment/data/mp_repository_test.dart`
- Mock de Supabase functions invoke.
- Manejo de error 502.
- Idempotency-key usado en retry.

### 5. Widget tests passenger

- `DestinationSearchScreen`: typing dispara debounced search.
- `TrackingScreen`: marker se mueve cuando viene update Realtime mock.
- `RideCompletedScreen`: render con datos mock + countup completo.

### 6. Integration tests Flutter

`apps/driver/integration_test/full_ride_flow_test.dart` y `apps/passenger/integration_test/`:

Test del flujo completo en device/emulator con backend real (Supabase local en CI service).

Pasos:
1. Login con OTP de prueba.
2. Pasajero pide remís.
3. Driver recibe pedido (mock: insertar manualmente vía supabase.from('rides').insert).
4. Driver acepta.
5. Verificar UI states.
6. Driver finaliza.
7. Verificar resumen.

Tagueado `@e2e` en los workflows; corren en `nightly.yml`, no en cada PR.

### 7. E2E tests dispatcher con Playwright

`apps/dispatcher/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // dispatcher es stateful, evitar races
  retries: 2,
  workers: 1,
  reporter: [['html'], ['github']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

#### `tests/e2e/login.spec.ts`
- Login válido → redirect a /.
- Login con role=passenger → bloqueado, redirect a login con error.
- Logout funciona.

#### `tests/e2e/queue-realtime.spec.ts`
- Login.
- Insertar ride directamente en DB (vía supabase service role).
- Verificar que aparece en cola en <2s.
- Verificar sound (mockear Web Audio).

#### `tests/e2e/assign-ride.spec.ts`
- Setup: 1 ride pending + 3 drivers online.
- Click en ride → AssignPanel abre con sugeridos.
- Tap sugerido 1 → confirm.
- Verificar UPDATE en DB.
- Toast "Asignado a X" visible.
- `Ctrl+Z` → unassign exitoso.

#### `tests/e2e/shortcuts.spec.ts`
- `Espacio` → focus form.
- `F5` → toggle programado/ahora.
- `Cmd+K` → command palette.
- `Cmd+1/2/3` → cambia densidad.

#### `tests/e2e/multi-monitor.spec.ts`
- Abrir ventana secundaria.
- BroadcastChannel sincroniza selección.

### 8. E2E web (landing)

`apps/web/tests/e2e/`:
- Landing renderiza Hero + secciones.
- Forms de contacto funcionan.
- Lighthouse score check (Lighthouse-CI integration).

### 9. Visual regression

`@playwright/test` con `toMatchSnapshot`:
- Screenshots de páginas críticas del dispatcher.
- En PR: comparar con baseline.
- Update con `--update-snapshots`.

Solo en `nightly`.

### 10. Performance tests

`tests/perf/`:
- Lighthouse CI: budget config en `lighthouserc.json` con LCP/INP/CLS budgets.
- k6 load test contra Edge Functions críticas (`mp-webhook` con 100 req/s).
- Resultado posteable a PostHog para tracking.

### 11. Mocking strategy

- **Supabase client:** mock con `mocktail` o usar local Supabase vía service container.
- **Tiempo:** `Clock` provider que se puede injectar con tiempo fijo.
- **Random:** `Random` provider injectable.
- **HTTP:** `http` mockeable.

Helper `test_utils/`:
- `pumpRiverpodWidget(widget, overrides)`.
- `mockSupabaseClient()`.
- `mockGoogleMaps()`.

### 12. Test data factories

`test/factories/`:
- `RideFactory.requested()`, `.assigned()`, `.completed()`.
- `DriverFactory.online()`, `.offline()`.
- `PassengerFactory.frequent()`.

Cada factory genera data válida con defaults sensatos + override por kwargs.

### 13. CI integration

Coverage report con `lcov` → comentario en PR con diff vs `main`.

Threshold mínimo:
- Lógica de negocio (`domain/`, `usecases/`): 70%.
- UI (`presentation/`): 30%.
- Total: 50%.

### 14. Documentación

`docs/testing.md`:
- Cómo correr cada nivel de tests local.
- Cómo agregar un test nuevo.
- Convenciones de naming (`featureName_scenario_expectedResult_test.dart`).
- Patterns aceptados.

## Acceptance criteria

- [ ] `supabase db test` corre con 5 archivos pgTAP, todos pasan.
- [ ] `flutter test` en driver y passenger pasa.
- [ ] `pnpm test:e2e` en dispatcher corre 5 specs y pasa contra Supabase local.
- [ ] CI ejecuta los 4 niveles en cada PR (rápidos) + nightly (lentos).
- [ ] Coverage report aparece en PRs.
- [ ] `docs/testing.md` listo.
- [ ] Commit `test: full coverage of critical paths`.

## Out of scope

- Mutation testing.
- Chaos engineering.
- Tests de integración con MP real (sandbox cuesta tiempo, hacer manual).

## Notas

- **Tests flaky son veneno.** Si un test falla 1 de cada 10 corridas: arreglarlo o eliminarlo. NO `retry: 5` para esconder el problema.
- **Goldens en CI:** la fuente y rendering puede variar entre OS. Mejor generar en Linux (CI) y reusar; locales actualizan con `--update-goldens` y commitean.
- **Maps en widget tests:** mockear `GoogleMap` con `ChildOnlyPlatformView` o platform mock — sino los tests son lentos y flaky.
