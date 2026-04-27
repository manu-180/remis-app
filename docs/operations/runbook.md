# Runbook operativo — Remisería

## 1. El conductor dice que no le entran pedidos

**Síntoma:** Conductor online en el sistema pero no recibe notificaciones de viajes.

**Diagnóstico:**
1. Verificar en `/admin/heartbeat-monitor` que el conductor tiene señal (última señal <2 min).
2. Si la señal falta → el dispositivo está matando la app (Xiaomi/Huawei/OPPO).
3. Si la señal existe → revisar FCM token en logs de Supabase Edge Functions.

**Fix:**
1. **Batería / autostart:** Pedir al conductor que vaya a Ajustes → Batería → Optimización de batería → buscar la app → "No restringir".
2. **Autostart (Xiaomi/Huawei):** Ajustes → Apps → Permisos especiales → Inicio automático → activar la app.
3. **Permiso de notificaciones:** Verificar que las notificaciones del sistema estén habilitadas.
4. **Servicio en primer plano:** Verificar que aparezca la notificación persistente "Conductor activo" en la barra de estado.
5. **Force-quit y reabrir:** Forzar cierre de la app y volver a abrirla.
6. **FCM token:** Pedir al conductor que cierre sesión y vuelva a iniciar sesión para regenerar el token.
7. **Versión:** Verificar en el heartbeat monitor que tenga la versión más reciente.
8. **Última instancia:** Desinstalar y reinstalar la app.

**Prevención:** Agregar pantalla de diagnóstico (7 taps en versión) para auto-check de permisos.

---

## 2. El pasajero dice que no llegó la confirmación

**Síntoma:** El viaje está asignado en el sistema pero el pasajero no recibió push.

**Diagnóstico:**
1. Verificar en Supabase Logs → Edge Functions → `send-push` que el evento fue procesado.
2. Buscar el `ride_id` en los logs de la función.
3. Si el log muestra éxito → el problema es del dispositivo/FCM del pasajero.
4. Si el log muestra error → revisar el FCM token del pasajero en `profiles`.

**Fix:**
1. Verificar permisos de notificación en el dispositivo del pasajero.
2. Si el FCM token está vacío: el pasajero debe reabrir la app (token se genera al iniciar sesión).
3. Si FCM retorna error `invalid-registration-token`: actualizar el token en BD (`profiles.fcm_token = null` para forzar regeneración).

**Prevención:** Monitorear tasa de entrega de push en Firebase Console.

---

## 3. MP webhook no procesa

**Síntoma:** El pago aparece como procesado en MercadoPago pero no en el sistema.

**Diagnóstico:**
1. Ir a Supabase Logs → Edge Functions → `mp-webhook`.
2. Buscar el `payment_id` en cuestión.
3. Error 400 → problema de firma HMAC.
4. Error 500 → error interno, ver stack trace en Sentry.

**Fix:**
1. **Firma inválida:** Verificar que `MERCADOPAGO_WEBHOOK_SECRET` en Supabase Secrets coincide con el configurado en el panel MP.
2. **Reconciliación manual:** Ejecutar desde Supabase SQL Editor:
   ```sql
   SELECT * FROM payment_webhook_logs WHERE payment_id = '<id>' ORDER BY created_at DESC;
   ```
3. Si el pago está confirmado en MP pero no en el sistema, actualizar manualmente:
   ```sql
   UPDATE rides SET payment_status = 'paid' WHERE id = '<ride_id>';
   ```

**Prevención:** El cron `cron-alerts-monitor` alertará si hay >5 errores en 1 hora.

---

## 4. Realtime se cae

**Síntoma:** El dispatcher no recibe actualizaciones en vivo, el mapa no mueve conductores.

**Diagnóstico:**
1. Ver el indicador de conexión en el dispatcher (esquina superior derecha).
2. Revisar https://status.supabase.com para ver si hay incidente.
3. En Supabase Logs → Realtime buscar errores de conexión.

**Fix:**
1. El cliente tiene auto-reconnect — esperar 30 segundos.
2. Si persiste: recargar la página del dispatcher.
3. Si el problema es de Supabase: esperar el fix upstream (seguir @supabase en Twitter).
4. Como workaround temporal: el dispatcher puede hacer polling manual desde `/rides` con F5.

---

## 5. DB lenta

**Síntoma:** Respuestas lentas en el dispatcher, timeouts en Edge Functions.

**Diagnóstico:**
1. Supabase Dashboard → SQL Editor → Performance:
   ```sql
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 20;
   ```
2. Revisar Supabase Dashboard → Reports → Advisors.

**Fix:**
1. Identificar la query lenta y agregar índice correspondiente.
2. Si el problema es de carga puntual (launch day), pausar jobs no críticos.
3. Si el problema es estructural: contactar Supabase Support (plan Pro).

---

## 6. SOS triggered

**Síntoma:** Alerta de SOS en Telegram con `ride_id`.

**Protocolo paso a paso:**
1. **Contactar al conductor** inmediatamente por teléfono.
2. Si no responde, **contactar al pasajero** con el teléfono del conductor en `profiles`.
3. Obtener la última ubicación conocida del conductor en `driver_locations`.
4. Si hay peligro real → **llamar al 911** y dar la ubicación.
5. Documentar el evento en `sos_events.notes`.
6. Ver protocolo completo: `docs/legal/sos_protocol.md`.

---

## 7. Brecha de datos

**Síntoma:** Acceso no autorizado a datos de usuarios.

**IR Plan:**
1. **Aislar:** Revocar credenciales comprometidas en Supabase → Settings → API → regenerar service_role key.
2. **Evaluar:** Determinar qué datos fueron expuestos (revisar logs de Supabase).
3. **Notificar:** Si hay datos personales de usuarios argentinos → notificar a AAIP en 72 horas (Ley 25.326).
4. **Remediar:** Parchear la vulnerabilidad, rotar todos los secrets.
5. Ver plan completo: `docs/legal/incident_response.md`.

---

## 8. Rollback de un deploy

**Síntoma:** Un deploy nuevo rompió algo en producción.

**Vercel (dispatcher + web):**
```bash
# Listar deployments
vercel ls --app dispatcher

# Promover el deployment anterior a producción
vercel rollback <deployment-url>
```
O desde el dashboard de Vercel → Deployments → el deployment anterior → "Promote to Production".

**Supabase Edge Functions:**
```bash
# Las funciones tienen versiones en el repositorio — hacer revert del commit y redeploy
git revert <commit-hash>
git push
# CI/CD redespleya automáticamente
```

**Flutter apps:** No hay rollback automático. Publicar nueva versión con el fix. Para emergencias extremas, contactar a los stores para suspender la versión.

---

## 9. Restaurar de backup

**Contexto:** Supabase Pro tiene Point-in-Time Recovery (PITR) con retención de 7 días.

**Procedimiento:**
1. Supabase Dashboard → Settings → Backups.
2. Seleccionar el punto en el tiempo (PITR) al que restaurar.
3. Hacer clic en "Restore" — esto crea una nueva instancia, NO modifica la actual.
4. Verificar datos en la instancia restaurada.
5. Si es correcto: actualizar las variables de entorno de Vercel para apuntar a la nueva instancia.
6. Comunicar downtime estimado (15-30 min).

**IMPORTANTE:** El restore desde PITR crea una instancia nueva. Los datos escritos después del punto de restore se pierden.
