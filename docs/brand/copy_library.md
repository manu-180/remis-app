> **Borrador para revisión con cliente. Versión 0.1.0**

# Copy Library — [NOMBRE]

Biblioteca central de strings de UI para las tres apps de [NOMBRE]:
pasajero (Flutter), conductor (Flutter) y despachante (Next.js web).

---

## Instrucciones de uso

### Cómo referenciar un string en código

Cada string tiene un **ID estable en dot-notation** (ej. `push.ride.assigned`).
En Flutter, centralizar en un archivo `app_strings.dart` o equivalente.
En Next.js, centralizar en `lib/strings.ts` o en archivos de `i18n/es.json`.

```dart
// Flutter — ejemplo
Text(AppStrings.statusPassengerSearching)
```

```ts
// Next.js — ejemplo
import strings from '@/lib/strings'
<p>{strings['status.passenger.searching']}</p>
```

### Cómo agregar un string nuevo

1. Elegir la categoría correcta (A–I).
2. Asignar el próximo ID correlativo dentro de esa categoría.
3. Respetar el límite de caracteres indicado en el encabezado.
4. Seguir las reglas de voz (voseo, verbos activos, sin exclamaciones, sin diminutivos).
5. Actualizar el conteo total al pie del archivo.

### Nota sobre i18n

Este archivo es la semilla para i18n futuro. Mantener IDs estables.
No cambiar un ID ya asignado aunque cambie el texto — usar versioning si fuera necesario.

---

## Reglas de voz (resumen)

- Voseo rioplatense siempre: "querés", "fijate", "tu viaje"
- Frases cortas (máx 18 palabras)
- Verbos activos en presente
- Sin diminutivos infantilizantes
- Sin signos de exclamación (salvo SOS y notificaciones críticas)
- Sin emoji en UI productiva
- Sin tecnicismos passenger-facing
- Términos preferidos: "Remís", "Pedido", "Conductor", "Pasajero", "Móvil N"
- Términos prohibidos: "Plataforma", "ride-hailing", "Driver", "Premium"

---

## A. Onboarding conductor

### [onboard.driver.step1] [pantalla de bienvenida] [conductor] [título ≤40c / cuerpo ≤120c]
title: Bienvenido a [NOMBRE]
body: Acá gestionás tus viajes y te mantenés en contacto con el despacho. El proceso tarda menos de 3 minutos.
cta: Empezar

### [onboard.driver.step2] [permiso de ubicación — before request] [conductor] [título ≤40c / cuerpo ≤120c]
title: Necesitamos tu ubicación
body: El despacho te asigna pedidos según dónde estás. Sin ubicación activa no podés recibir viajes.
cta: Permitir ubicación

### [onboard.driver.step3] [permiso de notificaciones — before request] [conductor] [título ≤40c / cuerpo ≤120c]
title: Activá las notificaciones
body: Así te avisamos cuando el despacho te asigna un pedido, aunque la app esté en segundo plano.
cta: Permitir notificaciones

### [onboard.driver.step4] [carga de foto de perfil] [conductor] [título ≤40c / cuerpo ≤120c]
title: Tu foto de perfil
body: El pasajero ve tu foto antes de subir al remís. Usá una foto clara, de frente y reciente.
cta: Subir foto

### [onboard.driver.step5] [verificación de documentos del vehículo] [conductor] [título ≤40c / cuerpo ≤120c]
title: Documentos del vehículo
body: Subí cédula verde, VTV y seguro vigentes. El despacho los revisa antes de habilitarte.
cta: Cargar documentos

### [onboard.driver.step6] [configuración de zona de trabajo] [conductor] [título ≤40c / cuerpo ≤120c]
title: Tu zona de trabajo
body: Indicá en qué sectores del pueblo trabajás habitualmente. El despacho lo tiene en cuenta al asignarte pedidos.
cta: Configurar zona

### [onboard.driver.step7] [primer cambio de estado — ponerse disponible] [conductor] [título ≤40c / cuerpo ≤120c]
title: Ponete disponible
body: Cuando estés listo para recibir pedidos, cambiá tu estado a "Disponible". Podés hacerlo desde la pantalla principal.
cta: Estoy disponible

### [onboard.driver.step8] [confirmación de onboarding completo] [conductor] [título ≤40c / cuerpo ≤120c]
title: Todo listo
body: Tu cuenta está activa. El despacho ya puede asignarte pedidos. Cualquier duda, llamá al despacho.
cta: Ir a la app

---

## B. Onboarding pasajero

### [onboard.passenger.step1] [pantalla de bienvenida] [pasajero] [título ≤40c / cuerpo ≤120c]
title: Bienvenido a [NOMBRE]
body: Pedí tu remís en segundos. Un conductor del despacho local te atiende.
cta: Empezar

### [onboard.passenger.step2] [permiso de ubicación — before request] [pasajero] [título ≤40c / cuerpo ≤120c]
title: Usá tu ubicación actual
body: Así no tenés que escribir tu dirección. Podés modificarla antes de confirmar el pedido.
cta: Permitir ubicación

### [onboard.passenger.step3] [ingreso de teléfono o datos de contacto] [pasajero] [título ≤40c / cuerpo ≤120c]
title: Tu número de teléfono
body: Lo usamos para que el conductor pueda contactarte si es necesario. No se comparte con terceros.
cta: Confirmar número

---

## C. Push notifications

### [push.ride.assigned] [push notification — viaje asignado] [pasajero] [título ≤40c / body ≤80c]
title: Conductor asignado
body: Tu remís está en camino. Llegada estimada: {eta} min.

### [push.ride.en_route] [push notification — conductor en camino] [pasajero] [título ≤40c / body ≤80c]
title: Tu conductor está en camino
body: {driver_name} — Móvil {mobile_number} — llega en {eta} min.

### [push.ride.arrived] [push notification — conductor llegó] [pasajero] [título ≤40c / body ≤80c]
title: Tu remís llegó
body: El conductor está esperándote en {pickup_address}.

### [push.ride.completed] [push notification — viaje finalizado] [pasajero] [título ≤40c / body ≤80c]
title: Viaje completado
body: Gracias por usar [NOMBRE]. Tu recorrido finalizó en {dropoff_address}.

### [push.ride.cancelled_driver] [push notification — viaje cancelado por conductor] [pasajero] [título ≤40c / body ≤80c]
title: Se canceló tu pedido
body: El conductor no pudo atenderte. El despacho está buscando otro.

### [push.ride.cancelled_passenger] [push notification — viaje cancelado por pasajero] [conductor] [título ≤40c / body ≤80c]
title: Pedido cancelado
body: El pasajero canceló el viaje en {address}. Quedás disponible.

### [push.driver.new_request] [push notification — nuevo pedido entrante] [conductor] [título ≤40c / body ≤80c]
title: Nuevo pedido
body: Recoger en {pickup_address}. Aceptá antes de que se reasigne.

### [push.driver.timeout] [push notification — pedido expirado sin respuesta] [conductor] [título ≤40c / body ≤80c]
title: Pedido reasignado
body: No respondiste a tiempo. El pedido fue a otro conductor.

### [push.document.expiring] [push notification — documento por vencer] [conductor] [título ≤40c / body ≤80c]
title: Documento por vencer
body: Tu {document_name} vence el {expiry_date}. Renovalo para seguir activo.

### [push.document.expired] [push notification — documento vencido] [conductor] [título ≤40c / body ≤80c]
title: Documento vencido
body: Tu {document_name} está vencido. No podés recibir pedidos hasta renovarlo.

---

## D. Estados de viaje — pasajero

### [status.passenger.searching] [label de estado en pantalla principal] [pasajero] [≤40c]
Buscando conductor

### [status.passenger.assigned] [label de estado en pantalla principal] [pasajero] [≤40c]
Conductor asignado — llega en {eta} min

### [status.passenger.en_route] [label de estado en pantalla principal] [pasajero] [≤40c]
Tu conductor está en camino

### [status.passenger.arrived] [label de estado en pantalla principal] [pasajero] [≤40c]
Tu remís llegó

### [status.passenger.on_trip] [label de estado en pantalla principal] [pasajero] [≤40c]
En viaje

### [status.passenger.completed] [label de estado en pantalla principal] [pasajero] [≤40c]
Viaje finalizado

### [status.passenger.cancelled] [label de estado en pantalla principal] [pasajero] [≤40c]
Pedido cancelado

### [status.passenger.no_show] [label de estado — pasajero no estaba] [pasajero] [≤40c]
No se encontró al pasajero

---

## E. Estados de viaje — conductor

### [status.driver.new_request] [label de estado en pantalla principal] [conductor] [≤40c]
Pedido entrante

### [status.driver.accepted] [label de estado en pantalla principal] [conductor] [≤40c]
Pedido aceptado

### [status.driver.en_route] [label de estado en pantalla principal] [conductor] [≤40c]
En camino al pasajero

### [status.driver.arrived] [label de estado en pantalla principal] [conductor] [≤40c]
Llegaste al punto de encuentro

### [status.driver.on_trip] [label de estado en pantalla principal] [conductor] [≤40c]
Viaje en curso

### [status.driver.completed] [label de estado en pantalla principal] [conductor] [≤40c]
Viaje completado

### [status.driver.cancelled] [label de estado en pantalla principal] [conductor] [≤40c]
Viaje cancelado

### [status.driver.no_show] [label de estado — pasajero no estaba] [conductor] [≤40c]
Pasajero no encontrado

---

## F. Errores

### [error.network] [error inline / toast] [todos] [mensaje ≤60c / acción ≤40c]
mensaje: Sin conexión a internet.
acción: Revisá tu señal e intentá de nuevo.

### [error.location_unavailable] [error inline] [pasajero / conductor] [mensaje ≤60c / acción ≤40c]
mensaje: No podemos acceder a tu ubicación.
acción: Activá la ubicación en la configuración del teléfono.

### [error.no_drivers] [error inline — sin conductores disponibles] [pasajero] [mensaje ≤60c / acción ≤40c]
mensaje: No hay conductores disponibles ahora.
acción: Intentá en unos minutos o llamá al despacho.

### [error.payment_failed] [error inline — pago rechazado] [pasajero] [mensaje ≤60c / acción ≤40c]
mensaje: No se pudo procesar el pago.
acción: Revisá los datos de tu tarjeta e intentá de nuevo.

### [error.payment_method_invalid] [error inline — método de pago inválido] [pasajero] [mensaje ≤60c / acción ≤40c]
mensaje: El método de pago no es válido.
acción: Agregá un método de pago vigente.

### [error.ride_already_assigned] [error inline — pedido ya tomado] [conductor] [mensaje ≤60c / acción ≤40c]
mensaje: Este pedido ya fue asignado a otro conductor.
acción: Esperá el próximo pedido del despacho.

### [error.session_expired] [error inline / modal bloqueante] [todos] [mensaje ≤60c / acción ≤40c]
mensaje: Tu sesión expiró.
acción: Ingresá de nuevo con tu número de teléfono.

### [error.document_expired] [error inline — conductor bloqueado] [conductor] [mensaje ≤60c / acción ≤40c]
mensaje: Tenés un documento vencido.
acción: Actualizá tus documentos para recibir pedidos.

### [error.generic_fallback] [error inline — error desconocido] [todos] [mensaje ≤60c / acción ≤40c]
mensaje: Algo falló de nuestro lado.
acción: Cerrá la app, volvé a abrirla e intentá de nuevo.

### [error.sos_failed] [error crítico — SOS no enviado] [todos] [mensaje ≤60c / acción ≤40c]
mensaje: No se pudo enviar la alerta de emergencia.
acción: Llamá al despacho directamente: (2954) _______.

---

## G. Empty states

### [empty.rides_history] [pantalla de historial vacío] [pasajero] [título ≤40c / cuerpo ≤100c]
title: Aún no hiciste ningún viaje
body: Cuando completes tu primer pedido, lo vas a ver acá.

### [empty.driver_list] [panel despachante — sin conductores] [despachante] [título ≤40c / cuerpo ≤100c]
title: No hay conductores activos
body: Ningún conductor está disponible en este momento.

### [empty.messages] [bandeja de mensajes vacía] [todos] [título ≤40c / cuerpo ≤100c]
title: Sin mensajes
body: Los avisos del despacho aparecen acá.

### [empty.notifications] [centro de notificaciones vacío] [todos] [título ≤40c / cuerpo ≤100c]
title: Sin notificaciones
body: Acá vas a ver las novedades sobre tus pedidos y tu cuenta.

### [empty.search_results] [búsqueda sin resultados] [despachante] [título ≤40c / cuerpo ≤100c]
title: Sin resultados
body: Probá con otra dirección o revisá si está bien escrita.

---

## H. Confirmaciones

### [confirm.ride_requested] [toast / banner de confirmación] [pasajero] [≤80c]
Pedido enviado. El despacho está buscando un conductor.

### [confirm.ride_accepted] [toast / banner de confirmación] [conductor] [≤80c]
Pedido aceptado. Dirigite a {pickup_address}.

### [confirm.ride_cancelled] [toast / banner de confirmación] [todos] [≤80c]
Viaje cancelado.

### [confirm.payment_processed] [toast / banner de confirmación] [pasajero] [≤80c]
Pago registrado.

### [confirm.profile_updated] [toast / banner de confirmación] [todos] [≤80c]
Perfil actualizado correctamente.

---

## I. Strings extra

### Modales de confirmación

#### [modal.cancel_ride.title] [modal bloqueante — confirmar cancelación] [pasajero] [≤40c]
¿Cancelás el pedido?

#### [modal.cancel_ride.body] [modal bloqueante — confirmar cancelación] [pasajero] [≤100c]
Una vez cancelado, el conductor queda libre. Si necesitás un remís, hacé un pedido nuevo.

#### [modal.cancel_ride.cta_confirm] [botón de confirmación de cancelación] [pasajero] [≤20c]
Cancelar pedido

#### [modal.cancel_ride.cta_dismiss] [botón de descarte de cancelación] [pasajero] [≤20c]
Volver

#### [modal.no_show.title] [modal — conductor marca no-show] [conductor] [≤40c]
¿El pasajero no estaba?

#### [modal.no_show.body] [modal — conductor marca no-show] [conductor] [≤100c]
Confirmá solo si esperaste al menos 3 minutos en el punto de encuentro.

#### [modal.no_show.cta_confirm] [botón de confirmación no-show] [conductor] [≤20c]
Confirmar

#### [modal.no_show.cta_dismiss] [botón de descarte no-show] [conductor] [≤20c]
Seguir esperando

### Placeholders de inputs

#### [input.address.placeholder] [campo de dirección de origen] [pasajero] [≤40c]
Ej: San Martín 450

#### [input.destination.placeholder] [campo de dirección de destino] [pasajero] [≤40c]
Ej: Hospital o Rivadavia 200

#### [input.phone.placeholder] [campo de teléfono] [todos] [≤30c]
(2954) ______

#### [input.notes.placeholder] [campo de notas al conductor] [pasajero] [≤50c]
Detalles útiles para el conductor (opcional)

### Labels de formularios

#### [label.pickup_address] [label de formulario de pedido] [pasajero] [≤30c]
Punto de encuentro

#### [label.dropoff_address] [label de formulario de pedido] [pasajero] [≤30c]
Destino

#### [label.notes_to_driver] [label de formulario de pedido] [pasajero] [≤30c]
Nota para el conductor

#### [label.vehicle_plate] [label de formulario de conductor] [conductor] [≤30c]
Patente del vehículo

#### [label.vehicle_model] [label de formulario de conductor] [conductor] [≤30c]
Modelo del vehículo

#### [label.driver_status] [label de selector de estado] [conductor] [≤30c]
Tu estado actual

### Tooltips de onboarding

#### [tooltip.driver_status] [tooltip sobre selector de estado] [conductor] [≤100c]
"Disponible" significa que el despacho puede asignarte pedidos. Cambiá a "No disponible" cuando tomés un descanso.

#### [tooltip.document_expiry] [tooltip sobre vencimiento de documentos] [conductor] [≤100c]
Renová tus documentos antes del vencimiento para no interrumpir tu actividad.

#### [tooltip.zone_config] [tooltip sobre configuración de zona] [conductor] [≤100c]
Podés cambiar tu zona de trabajo en cualquier momento desde tu perfil.

---

## Conteo total de strings

| Categoría | Strings |
|---|---|
| A. Onboarding conductor | 8 |
| B. Onboarding pasajero | 3 |
| C. Push notifications | 10 |
| D. Estados de viaje — pasajero | 8 |
| E. Estados de viaje — conductor | 8 |
| F. Errores | 10 |
| G. Empty states | 5 |
| H. Confirmaciones | 5 |
| I. Strings extra (modales, placeholders, labels, tooltips) | 16 |
| **Total** | **73** |

---

*Versión 0.1.0 — Para revisión con cliente antes de implementar.*
