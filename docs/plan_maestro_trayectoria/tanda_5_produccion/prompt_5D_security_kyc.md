# Prompt 5D — Security + KYC: Didit, Rekognition, Twilio Proxy, hardening

> **LEÉ:** `00_arquitectura.md` (sec 2.6), `docs/legal/privacy_policy.md`, `docs/legal/incident_response.md`, `docs/legal/sos_protocol.md`, `00_file_ownership_matrix.md`.

## Objetivo

Cerrar el círculo de seguridad operativa antes del lanzamiento real con clientes pagantes:
1. **KYC del conductor** en onboarding (Didit) + verificación intra-turno (AWS Rekognition CompareFaces).
2. **Masked calling** entre pasajero y conductor (Twilio Proxy).
3. **Security hardening:** rate-limiting, abuse detection, secret rotation, audit reviews.
4. **Mitigaciones** a los 6 casos de fraude documentados.
5. **Inscripción AAIP** ejecutada (no solo el plan).

## File ownership

✍️ `apps/driver/lib/features/kyc/**`, `apps/dispatcher/src/features/kyc/**`, `supabase/functions/kyc-*/**`, `supabase/functions/twilio-*/**`, `supabase/functions/rate-limit/**`, `docs/security/**`, `docs/operations/aaip_filing.md` (ejecución del plan de Tanda 1C).

## Steps

### 1. KYC onboarding del conductor con Didit

**Setup cuenta Didit:**
- Crear cuenta en Didit (free tier inicial — verificar límites mensuales).
- Configurar webhook URL: `${SUPABASE_URL}/functions/v1/kyc-didit-webhook`.
- API key + Webhook secret a `supabase secrets`.

**Flujo:**

1. **En onboarding del conductor** (paso adicional al ya existente de Tanda 3A):
   - "Verificación de identidad" con CTA "Comenzar".
   - Edge Function `kyc-create-session` crea sesión Didit, retorna URL.
   - Apertura en Custom Tab.
   - Conductor: foto del DNI front + back + selfie con liveness check.
   - Vuelve a la app con deep link.

2. **Edge Function `kyc-didit-webhook`** procesa resultado:
   - Verifica firma del webhook.
   - Actualiza `kyc_verifications` con status (`approved`/`rejected`/`pending_review`).
   - Si approved: `drivers.is_active=true` (continúa onboarding).
   - Si rejected: notifica al admin; conductor queda bloqueado con razón.

3. **Datos persistidos:**
   - Foto del DNI (cifrada en Storage Supabase, bucket `kyc-private`).
   - Selfie de referencia (Storage `kyc-private`).
   - `dni_number` (encriptado en DB con pgsodium o solo hash).
   - **Nunca** persistir el video del liveness — descartar después del check.

4. **Datos en `kyc_verifications`:**
   ```
   id, driver_id, provider='didit', status, score (0-1),
   document_type='dni_ar', document_number_hash,
   verified_at, expires_at (1 año),
   metadata jsonb (Didit response sin PII raw),
   reference_face_url (Storage path)
   ```

### 2. Verificación intra-turno con AWS Rekognition

**Cuándo:**
- Pre-turno (al `startShift`): selfie obligatoria.
- Aleatoria 1× cada 4h durante turno.
- Antes de aceptar ride número 5, 15, 30, 60, etc.
- Si pasaron > 24h sin verificar.

**UX:**
- Pantalla `IntraShiftVerificationScreen` con cámara frontal.
- Overlay oval para alinear cara + texto "Mirá al frente y mantenete quieto".
- Captura automática cuando detecta face + liveness básico (parpadeo).
- Subida a Storage temporal `kyc-temp/`.
- Edge Function `kyc-compare-face` llama Rekognition `CompareFaces` contra `reference_face_url`.

**Edge Function `kyc-compare-face`:**
```ts
serve(async (req) => {
  const { driver_id, current_selfie_path } = await req.json();
  
  // get reference
  const { data: kyc } = await supabase
    .from('kyc_verifications').select('reference_face_url')
    .eq('driver_id', driver_id).eq('status', 'approved')
    .order('verified_at', { desc: true }).limit(1).single();
  
  const refImg = await supabase.storage.from('kyc-private').download(kyc.reference_face_url);
  const curImg = await supabase.storage.from('kyc-temp').download(current_selfie_path);
  
  const rekognition = new RekognitionClient({...});
  const result = await rekognition.send(new CompareFacesCommand({
    SourceImage: { Bytes: await refImg.arrayBuffer() },
    TargetImage: { Bytes: await curImg.arrayBuffer() },
    SimilarityThreshold: 80,
  }));
  
  const passed = result.FaceMatches?.[0]?.Similarity ?? 0 >= 90;
  
  await supabase.from('kyc_verifications').insert({
    driver_id, provider: 'aws_rekognition',
    status: passed ? 'approved' : 'rejected',
    score: result.FaceMatches?.[0]?.Similarity / 100,
    metadata: { source: 'intra_shift', similarity: result.FaceMatches?.[0]?.Similarity },
  });
  
  // borrar selfie temporal después del check
  await supabase.storage.from('kyc-temp').remove([current_selfie_path]);
  
  if (!passed) {
    // alertar dispatcher + suspender conductor
    await supabase.from('drivers').update({ is_online: false, current_status: 'suspended' }).eq('id', driver_id);
    await dispatcherAlert('kyc_intra_shift_failed', { driver_id, similarity: result.FaceMatches?.[0]?.Similarity });
  }
  
  return Response.json({ passed, similarity: result.FaceMatches?.[0]?.Similarity });
});
```

**Costo:** ~USD 0.001 por comparación. 50 conductores × 4 chequeos/día × 30 días = ~6000 comparaciones/mes = ~USD 6. Trivial.

**Privacy:**
- Imágenes temporales en `kyc-temp` con TTL automático (Storage policy).
- `reference_face_url` solo accesible vía service role.
- Conductor consiente explícitamente en onboarding.

### 3. Masked calling con Twilio Proxy

**Setup Twilio:**
- Activar Proxy product en cuenta.
- Comprar número argentino (+54).
- Configurar Proxy Service.

**Flujo:**

1. Cuando se asigna un ride: Edge Function `twilio-create-proxy-session` crea sesión Proxy con 2 participantes:
   - Pasajero (`+54...`).
   - Conductor (`+54...`).
   - Modo: voice only.
   - Time-out: 4h post-creación.

2. Edge Function devuelve **dos números proxy distintos** (uno por participante).

3. Cuando pasajero toca "Llamar conductor": app hace `tel:<proxy_number_for_passenger>`.
   - Twilio enruta a conductor sin exponer su número real.
   - Funcionalidad recíproca.

4. Llamadas se loguean en `phone_calls` table (insertable por webhook Twilio).

5. Al finalizar ride: cerrar sesión Proxy explícitamente.

**Edge Function `twilio-create-proxy-session`:**
```ts
const session = await twilioClient.proxy.services(SERVICE_SID).sessions.create({
  uniqueName: `ride_${rideId}`,
  ttl: 14400, // 4h
  mode: 'voice-only',
});

await session.participants.create({
  identifier: passenger.phone,
  friendlyName: passenger.full_name,
});
await session.participants.create({
  identifier: driver.phone,
  friendlyName: `Móvil ${driver.mobile_number}`,
});

// retornar números proxy
const participants = await session.participants.list();
return {
  passenger_proxy: participants.find(p => p.identifier === passenger.phone).proxyIdentifier,
  driver_proxy: participants.find(p => p.identifier === driver.phone).proxyIdentifier,
};
```

**Edge Function `twilio-incoming-webhook`** (TwiML):
- Loguea llamadas en `phone_calls`.
- TwiML response: `<Dial>` al participante destinatario.

**Costo:** ~USD 1/mes por número AR + ~USD 0.013/min llamadas. 50 viajes/día con 1min llamada promedio = ~USD 20/mes.

**Regla del 9 AR:** Twilio formatea automáticamente. Verificar con números reales en sandbox antes de prod.

### 4. Mitigaciones de fraude (los 6 casos del informe)

#### Caso 1: Conductor presta cuenta a tercero
- KYC selfie pre-turno (paso 2).
- Selfies aleatorias intra-turno.
- Auto-suspensión si similarity < 90%.

#### Caso 2: Modo avión para inflar tarifa
- Heartbeat cada 30s a `driver_heartbeats`.
- Si conductor está dentro de 50m del pickup >3min sin marcar `waiting_passenger`: push automático "¿Llegaste? Marcá tu llegada."
- Después de 5min sin marcar: dispatcher_alert al panel.
- Cron `detect-suspicious-rides` corre 1× hora y flagea rides con outliers (duración >2× distance/40km/h).

#### Caso 3: No cerrar viaje al llegar
- Geofence en destino: cuando driver entra al radio 50m del destino (geography ST_DWithin), enviar push "¿Llegaste a destino? Cerrá el viaje."
- Si parado >120s en destino sin cerrar: forzar `status='completed'` automático con flag `auto_closed=true` para revisión.

#### Caso 4: Conductor distinto al de la foto
- KYC selfie pre-turno cubre.
- Pasajero puede reportar "no es el conductor" en post-trip rating con campo abierto → genera `dispatcher_alert`.

#### Caso 5: Cancelaciones masivas (boicot)
- Rate-limit por conductor: max 3 cancelaciones/h.
- Si supera: suspensión automática 24h.
- Cron `analyze-cancellation-patterns` 1× día detecta concentraciones inusuales.

#### Caso 6: Robo de cuenta
- OTP por SMS (ya en auth Tanda 2A).
- Bind a `device_id` (registrar en login + revisar en cada session refresh).
- Cambio de device requiere re-OTP + selfie.
- Tabla `device_bindings`: `id, user_id, device_id, device_info, bound_at, revoked_at`.
- Si llega request con device_id distinto al bound: forzar re-auth + KYC.

### 5. Rate limiting general

Edge Function middleware `rate-limit`:
- Token bucket por user_id + endpoint.
- Buckets típicos:
  - `mp-create-preference`: 10/min por user.
  - `kyc-compare-face`: 20/h por driver.
  - `twilio-create-proxy-session`: 100/día por dispatcher.
  - `register-fcm-token`: 5/h por device.
- Storage: tabla `rate_limit_buckets` con TTL automático.
- Headers de respuesta: `X-RateLimit-Remaining`, `Retry-After`.

### 6. Security hardening

#### Headers de seguridad (Next.js)

`next.config.js`:
```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
    ],
  }];
}
```

CSP elaborado para permitir Supabase, Mapbox/MapLibre, MP, fonts, etc.

#### Auditoría de RLS

Script `scripts/audit-rls.sql`:
- Lista todas las tablas en `public`.
- Para cada una: verifica que tenga `relrowsecurity=true`.
- Lista todas las policies y valida que cubren {SELECT, INSERT, UPDATE, DELETE} cuando aplica.
- Output como reporte que se corre en CI nightly.

#### Secrets rotation

Cron mensual: warning a admin "[N] secrets vencen en próximos 30 días". Lista de secrets con `expires_at` documentado.

#### Backup verification

Cron semanal: hace test restore de un backup en Supabase staging. Si falla: alerta crítica.

#### Storage policies

- Buckets `kyc-private`, `audit-attachments`: solo service role.
- Bucket `avatars`: público read, solo el owner write.
- Bucket `kyc-temp`: TTL 24h con lifecycle rule.

#### CORS

Edge Functions con whitelist explícita:
- `mp-webhook`: solo MP origin (verificación adicional vía firma).
- otras: dominios propios (`https://dispatch.<domain>`, `https://<domain>`).

### 7. Logging de eventos de seguridad

Tabla `security_events`:
- Login successful / failed.
- Password change.
- Device change.
- KYC failure intra-turno.
- Rate limit hit.
- 401/403 en endpoints sensibles.

Retención: 2 años.

Vista admin `/admin/security` con filtros + búsqueda.

### 8. Inscripción AAIP

Ejecutar `docs/legal/aaip_registration.md` (que era el plan):
- Llenar formulario AAIP con CUIT, datos de la base, finalidades, cesiones, medidas.
- Enviar.
- Documentar número de registro recibido.
- Actualizar `docs/legal/privacy_policy.md` con número.

`docs/operations/aaip_filing.md`: registro del proceso, fechas, screenshots, número final.

### 9. Penetration testing checklist

`docs/security/pentest_checklist.md`:
- OWASP Top 10 (web).
- OWASP Mobile Top 10.
- Casos específicos:
  - SQL injection (Supabase RPC params bien tipados).
  - SSRF en Edge Functions (whitelist hosts).
  - XSS en dispatcher (React escapa, pero verificar `dangerouslySetInnerHTML` que no exista).
  - JWT replay (Supabase ya maneja, pero verificar que no se logueen tokens).
  - Storage public por error.

Encargar pentest externo opcional pre-launch. Documentar findings en `docs/security/pentest_findings.md`.

### 10. Política de bug bounty (informal)

`docs/security/responsible_disclosure.md`:
- Email para reportes: `security@<domain>`.
- Plazos de respuesta (72h ack, 30 días resolution para criticos).
- Acuerdo: no publicar antes de fix.
- Reconocimiento opcional con merchandise / crédito MP.

### 11. Hardening específico mobile

#### Driver

- Pin/biometría para abrir la app después de 1h cerrada.
- App tampering detection (`flutter_jailbreak_detection`): si rooteado, bloquear uso de KYC.
- Debugger detection en builds release.

#### Passenger

- Pin opcional (no obligar — algunos mayores se confunden).
- Logout remoto desde panel admin.

### 12. Documentar amenazas

`docs/security/threat_model.md`:
- STRIDE per componente.
- Impacto + likelihood matrix.
- Mitigaciones aplicadas.

Mantener vivo (revisar 1× cuatrimestre).

## Acceptance criteria

- [ ] KYC Didit funciona end-to-end: conductor sube DNI + selfie, recibe approved, queda activo.
- [ ] Selfie pre-turno bloquea startShift si falla.
- [ ] Comparación intra-turno detecta cara distinta (test manual con persona distinta).
- [ ] Twilio Proxy enmascara llamadas pasajero↔conductor.
- [ ] Rate-limit aplicado en endpoints clave.
- [ ] Headers de seguridad pasan `securityheaders.com` con A+.
- [ ] Auditoría RLS no detecta tablas sin policies.
- [ ] AAIP filed (con número o ack del trámite).
- [ ] `docs/security/threat_model.md` revisado.
- [ ] Probado caso de fraude #1, #3, #6 manualmente.
- [ ] Commit `feat(security): KYC, masked calling, hardening, AAIP filing`.

## Out of scope

- Bug bounty plataforma (HackerOne/Bugcrowd) — overkill para esta escala.
- ISO 27001 certification.
- SOC2.

## Notas

- **Didit free tier:** verificar límites mensuales. Si volumen lo supera, plan paid o alternativa (Veriff, Onfido más caros).
- **Rekognition costos:** monitorear. Si crece mucho, batch processing nightly en lugar de en tiempo real.
- **Twilio Proxy regional:** en algunas regiones Latam tiene latencia de >1s para conectar — testear en La Pampa real.
- **AAIP timing:** trámite puede demorar 30-60 días. Iniciar al comenzar Tanda 5, no al final.
- **No persistir DNI número en plain text.** Hash con SHA-256 + salt o cifrar con pgsodium.
