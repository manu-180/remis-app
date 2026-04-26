# Prompt 4D — MercadoPago: integración end-to-end

> **LEÉ:** `00_arquitectura.md` (sec 2.5), `tanda_3_core_features/prompt_3D_edge_functions.md` (sección mp-webhook stub), `00_file_ownership_matrix.md`.

## Objetivo

Integrar MercadoPago Checkout Pro end-to-end: el pasajero al pedir un viaje puede elegir MP, se crea preference en backend, abre Custom Tab de Checkout, completa pago, vuelve a la app, webhook procesa, ride se actualiza, recibo refleja. **Todo idempotente, con HMAC verificada, con polling de respaldo.**

## File ownership

✍️ `apps/passenger/lib/features/payment/**`, `supabase/functions/mp-webhook/**` (completar), `supabase/functions/mp-create-preference/**` (completar), `supabase/migrations/0070_mp_*.sql` si necesario.

## Steps

### 1. Configuración cuenta MP (cliente)

Documentar en `docs/operations/mercadopago_setup.md`:
- Crear cuenta de la agencia (si no existe).
- Activar Checkout Pro en Argentina.
- Generar credenciales: `Public Key` (mobile) + `Access Token` (server).
- Configurar acreditación: **14 días = 3,49%** (recomendado).
- Habilitar webhooks en Dashboard MP, URL: `${SUPABASE_URL}/functions/v1/mp-webhook?data.id=<id>`.
- Configurar webhook secret y guardarlo en `MP_WEBHOOK_SECRET`.
- Sandbox + Producción: ambos configurados, env separado.

Secrets:
```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR-...
supabase secrets set MP_WEBHOOK_SECRET=...
supabase secrets set MP_PUBLIC_KEY=APP_USR-...
```

### 2. Edge Function `mp-create-preference` completa

Reemplazar el stub de Tanda 3D:

```ts
// supabase/functions/mp-create-preference/index.ts
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const supabase = createUserClient(req); // JWT del pasajero
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  
  const { ride_id } = await req.json();
  
  // verificar que el ride pertenece al pasajero
  const { data: ride } = await supabase
    .from('rides').select('*').eq('id', ride_id).eq('passenger_id', user.id).single();
  if (!ride) return Response.json({ error: 'ride not found' }, { status: 404 });
  if (ride.payment_status === 'approved') 
    return Response.json({ error: 'already paid' }, { status: 400 });
  
  // idempotency-key para reusar preferencia si la cliente reintenta
  const idempotencyKey = `pref_${ride_id}`;
  
  const preferenceBody = {
    items: [{
      id: ride_id,
      title: `Viaje #${ride_id.slice(0,8)} - ${ride.pickup_address} → ${ride.dest_address}`,
      quantity: 1,
      currency_id: 'ARS',
      unit_price: Number(ride.estimated_fare_ars ?? ride.final_fare_ars),
    }],
    external_reference: ride_id,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook?source=ipn`,
    back_urls: {
      success: `remiseriapampa://payment/success?ride_id=${ride_id}`,
      failure: `remiseriapampa://payment/failure?ride_id=${ride_id}`,
      pending: `remiseriapampa://payment/pending?ride_id=${ride_id}`,
    },
    auto_return: 'approved',
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }], // sin Rapipago/PagoFacil para viaje inmediato
      installments: 1,
    },
    payer: {
      name: ride.passenger_name ?? user.user_metadata?.full_name,
      phone: { area_code: '54', number: user.phone?.slice(3) },
    },
    expires: true,
    expiration_date_to: new Date(Date.now() + 30*60*1000).toISOString(), // 30 min
  };
  
  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(preferenceBody),
  });
  
  const pref = await mpRes.json();
  if (!mpRes.ok) {
    console.error({ event: 'mp_preference_error', error: pref });
    return Response.json({ error: 'mp error', details: pref }, { status: 502 });
  }
  
  // guardar preference id
  await supabase.from('payments').upsert({
    ride_id,
    method: 'mp_checkout',
    amount_ars: ride.estimated_fare_ars,
    status: 'pending',
    mp_preference_id: pref.id,
    mp_external_reference: ride_id,
  }, { onConflict: 'ride_id' });
  
  return Response.json({
    preference_id: pref.id,
    init_point: pref.init_point, // URL para Checkout Pro
    sandbox_init_point: pref.sandbox_init_point,
  });
});
```

### 3. Cliente Flutter: `flutter_custom_tabs`

`apps/passenger/lib/features/payment/`:

```
features/payment/
├── data/
│   └── mp_repository.dart
├── domain/
│   └── payment_models.dart
├── presentation/
│   ├── widgets/
│   │   ├── payment_method_picker.dart
│   │   └── payment_pending_card.dart
│   └── controllers/
│       └── mp_payment_controller.dart
└── deeplink_handler.dart
```

`mp_repository.dart`:
```dart
class MpRepository {
  Future<MpPreference> createPreference(String rideId) async {
    final res = await supabase.functions.invoke('mp-create-preference', body: {'ride_id': rideId});
    return MpPreference.fromJson(res.data);
  }
}
```

`mp_payment_controller.dart`:
```dart
@riverpod
class MpPaymentController extends _$MpPaymentController {
  @override
  AsyncValue<PaymentState> build(String rideId) => const AsyncValue.data(PaymentState.idle());

  Future<void> startCheckout() async {
    state = const AsyncLoading();
    try {
      final pref = await ref.read(mpRepoProvider).createPreference(rideId);
      await launchUrl(
        Uri.parse(Env.flavor == 'prd' ? pref.initPoint : pref.sandboxInitPoint),
        customTabsOptions: CustomTabsOptions(
          colorSchemes: CustomTabsColorSchemes.defaults(
            toolbarColor: const Color(0xFF1B2A4E),
          ),
          shareState: CustomTabsShareState.off,
        ),
      );
      state = const AsyncData(PaymentState.waitingReturn());
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}
```

### 4. Deep link handling + polling

`deeplink_handler.dart`: el back_url `remiseriapampa://payment/success?ride_id=X` regresa a la app. App detecta el deep link con `app_links` package.

Al volver:
- Mostrar `PaymentReturnScreen` con loader: "Verificando tu pago...".
- **Polling exponencial** al endpoint `/functions/v1/payment-status?ride_id=X` (Edge Function que consulta `payments.status`):
  - Delays: 0.5s, 1s, 2s, 4s, 8s (max 16s total, ≈5 intentos).
- Si webhook ya procesó (status='approved'): mostrar success screen.
- Si después de 16s aún pending: mostrar "Tu pago se está procesando. Te avisamos cuando se confirme." (passenger continúa, ride sigue su flujo, push llega cuando webhook procesa).

`payment-status` Edge Function (nueva):
```ts
serve(async (req) => {
  const supabase = createUserClient(req);
  const { ride_id } = Object.fromEntries(new URL(req.url).searchParams);
  const { data } = await supabase.from('payments').select('status, mp_payment_id').eq('ride_id', ride_id).single();
  return Response.json(data);
});
```

### 5. Webhook procesamiento completo

Reemplazar el stub de `mp-webhook` con procesamiento real:

```ts
// supabase/functions/mp-webhook/index.ts (parte que faltaba)
async function processMpPayment(supabase: any, eventId: string, dataId: string, action: string) {
  try {
    // GET /v1/payments/{id}
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        'X-Idempotency-Key': `webhook_${eventId}`,
      },
    });
    const payment = await mpRes.json();
    if (!mpRes.ok) throw new Error(`MP API error: ${JSON.stringify(payment)}`);
    
    const rideId = payment.external_reference;
    if (!rideId) throw new Error('missing external_reference');
    
    // map status
    const statusMap = {
      'approved': 'approved',
      'rejected': 'rejected', 
      'in_process': 'pending',
      'pending': 'pending',
      'refunded': 'refunded',
      'cancelled': 'rejected',
      'charged_back': 'refunded',
    };
    const newStatus = statusMap[payment.status] ?? 'pending';
    
    // update payments + rides en transacción
    await supabase.from('payments').update({
      status: newStatus,
      mp_payment_id: String(payment.id),
      paid_at: payment.status === 'approved' ? new Date(payment.date_approved).toISOString() : null,
    }).eq('mp_external_reference', rideId);
    
    await supabase.from('rides').update({
      payment_status: newStatus,
    }).eq('id', rideId);
    
    // disparar push al pasajero si approved
    if (newStatus === 'approved') {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-fcm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_user_id: (await supabase.from('rides').select('passenger_id').eq('id', rideId).single()).data.passenger_id,
          type: 'payment_approved',
          ride_id: rideId,
          metadata: { amount: payment.transaction_amount },
        }),
      });
    }
    
    await supabase.from('mp_webhook_events').update({
      processed_status: 'success',
      processed_at: new Date().toISOString(),
    }).eq('id', eventId);
  } catch (e) {
    console.error({ event: 'mp_webhook_process_error', dataId, error: e.message });
    await supabase.from('mp_webhook_events').update({
      processed_status: 'error',
      processed_at: new Date().toISOString(),
      error_message: String(e.message),
    }).eq('id', eventId);
    throw e;
  }
}

// llamar dentro del handler con EdgeRuntime.waitUntil:
EdgeRuntime.waitUntil(processMpPayment(supabase, eventId, dataId, action));
```

**HMAC verificada** (ya en stub de Tanda 3D):
```ts
async function verifyMpSignature(xSig, xReqId, dataId, secret) {
  if (!xSig || !xReqId || !dataId) return false;
  const parts = Object.fromEntries(xSig.split(',').map(p => p.split('=')));
  const manifest = `id:${dataId.toLowerCase()};request-id:${xReqId};ts:${parts.ts};`;
  const computed = await hmacSha256Hex(secret, manifest);
  return timingSafeEqual(computed, parts.v1);
}
```

### 6. UI passenger: selección de método

En `RideRequestConfirmScreen` (Tanda 3B), el selector de pago se vuelve real:

```
Pago
┌─────────────────────────────────┐
│ ● Efectivo                      │
│   Le pagás al conductor.        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ○ MercadoPago                   │
│   Pagá ahora con tarjeta o     │
│   saldo de MP.                  │
└─────────────────────────────────┘
```

Si selecciona MP **se cobra ahora** (antes de pedir).

Flujo:
1. Pasajero confirma pedido con MP seleccionado.
2. Se crea ride en `requested` con `payment_status='pending'`, `payment_method='mp_checkout'`.
3. Se llama `mp-create-preference` → init_point.
4. Custom Tab abre Checkout.
5. Pasajero paga.
6. Custom Tab redirige a deep link → app vuelve.
7. Polling + webhook → estado actualizado.
8. Si `approved`: ride continúa flujo normal.
9. Si `rejected` o no llegó: ride se cancela `cancelled_payment_failed` y se le ofrece intentar con efectivo.

**Estado intermedio "pending"** (raro pero ocurre con efectivo en redes externas si dejás `ticket`): el ride se asigna igual, conductor sale, en algún momento durante el viaje el webhook confirma. Si no confirma en X tiempo: ride sigue como pending, dispatcher decide.

### 7. UI pasajero: estado de pago en el recibo

`RideCompletedScreen`:
- Si `payment_status='approved'`: badge "Pagado con MP" + número de transacción + botón "Ver comprobante" (URL al receipt MP).
- Si `payment_status='cash_at_arrival'`: badge "Pagado en efectivo".
- Si `payment_status='pending'`: badge naranja "Pago en proceso" + texto explicativo.

### 8. UI conductor: ver método de pago

En el `RideInProgressScreen` el conductor ve clarísimo el método:
- Efectivo: badge verde grande "EFECTIVO — Cobrá $1.200".
- MP: badge azul "MP — Ya pagado, no cobres".

### 9. UI dispatcher: filtros y reportes por método

Filtros de cola: "Todos / Efectivo / MP / Pendiente".

En reportes diarios (top bar dropdown), separar:
- Total efectivo: $X.
- Total MP: $Y.
- Pendientes de cobro MP: $Z.
- Comisión MP estimada (3.49%): $C.

### 10. Reembolsos

Edge Function `mp-refund`:
- Solo `dispatcher` o `admin` con justificación.
- POST `/v1/payments/{id}/refunds` (refund total) o con `amount` (parcial).
- Insert a `audit_log`.
- Update `payment.status='refunded'`.

UI en dispatcher: detail modal del ride → botón "Reembolsar" si `payment_status='approved'`.

### 11. Reconciliación diaria

Cron `mp-reconciliation` (1× día, 03:00):
- Para cada `payment.status='pending'` con >24hs: GET `/v1/payments/{mp_payment_id}` y actualizar.
- Para cada `payment.status='approved'` reportado el día anterior: marcar como reconciliado.
- Reportar discrepancias a `dispatcher_alerts`.

### 12. Tests E2E del flujo MP

`apps/dispatcher/tests/e2e/mp-payment.spec.ts` (Playwright — Tanda 5C lo expandirá; ahora dejar el stub):
- Crear ride con MP.
- Mock del webhook con firma válida.
- Verificar status update.

En passenger, test manual con MP sandbox card numbers.

### 13. Failure modes documentados

`apps/passenger/lib/features/payment/README.md`:
- Pago se cae a mitad: ride queda en `pending`, dispatcher puede manualmente cambiar a efectivo.
- Webhook no llega: polling salva en mayoría de casos; reconciliación nightly cubre el resto.
- Custom Tab falla en abrir: fallback a `WebView` interna NO permitido (deprecated). Mostrar error y ofrecer "Pagar en efectivo".

### 14. Feature flag

`feature_flags.mp_payment_enabled` — si false, el selector de método solo muestra "Efectivo".

Permite al cliente lanzar primero solo con efectivo y activar MP después de testear sandbox.

## Acceptance criteria

- [ ] Pasajero puede elegir MP → abre Checkout Pro en Custom Tab.
- [ ] Pago aprobado vuelve por deep link, polling resuelve, push llega.
- [ ] Webhook con firma inválida → 401.
- [ ] Webhook con firma válida → 200 + procesamiento async.
- [ ] Pago rechazado → ride cancelado con explicación.
- [ ] Idempotencia probada: misma `x-request-id` dos veces → no duplica.
- [ ] Reembolso desde dispatcher funciona.
- [ ] Reconciliación nocturna corre y actualiza pendientes.
- [ ] Conductor ve método correcto.
- [ ] Reportes por método funcionan.
- [ ] Probado con cards sandbox de MP (aprobada, rechazada, pending).
- [ ] Commit `feat(payment): MercadoPago Checkout Pro end-to-end`.

## Out of scope

- Suscripciones / pagos recurrentes (no aplica).
- Otros proveedores (Modo, Ualá): documentar como roadmap, no implementar.
- 3DS / Auth challenges: MP los maneja internamente.

## Notas

- **Deep link scheme** `remiseriapampa://`: registrarlo en AndroidManifest + Info.plist.
- **Sandbox vs Prod:** flag de Env. NO mezclar credentials.
- **MP en La Pampa (IIBB):** comisión puede variar según provincia; verificar con cliente la tabla actual.
- **Pago al conductor** (cuando el cliente quiere que cada conductor cobre directo a su MP, no a la agencia): NO implementar en esta tanda. Es una arquitectura distinta (split payments con marketplace MP) que requiere KYC adicional. Roadmap.
