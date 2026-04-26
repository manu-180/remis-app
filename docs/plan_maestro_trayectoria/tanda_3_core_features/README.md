# Tanda 3 — Core features

**Modo:** 4 prompts en paralelo.
**Duración estimada:** 6-12 horas cada sesión.
**Prerequisitos:** Tanda 2 completa (apps booteables).
**Salida:** flujo completo end-to-end "pasajero pide → despachante asigna → conductor acepta → realiza viaje → finaliza", **sin pago aún (Tanda 4D) y sin polish premium completo (Tanda 4)**. La operación funciona; lo bonito viene después.

## Prompts paralelos

| ID | Archivo | Output |
|----|---------|--------|
| 3A | `prompt_3A_driver_core.md` | Background GPS + recibir/aceptar pedido + flujo del viaje + onboarding 8 pasos |
| 3B | `prompt_3B_passenger_core.md` | Pedir viaje + tracking realtime + cancelación + historial real |
| 3C | `prompt_3C_dispatcher_core.md` | Cola Realtime + asignación click-to-dispatch + lista chofer activa + sugeridos |
| 3D | `prompt_3D_edge_functions.md` | FCM dispatcher, MP webhook stub, cron de docs, purga, health |

## Coordinación

Las features tocan **archivos disjuntos** dentro de cada app. La interfaz crítica entre 3A/3B/3C es el **schema de la DB** (cerrado en Tanda 1A) y los **eventos Realtime / FCM** (definidos abajo).

### Contratos de eventos (cerrados — no inventar)

#### Realtime — canales

- `agency:{id}:locations` (broadcast privado) — eventos `pos`: `{driver_id, lat, lng, heading, speed_mps, recorded_at}`.
- `agency:{id}:rides:queue` (postgres_changes) — INSERT/UPDATE de `rides where status in ('requested','assigned','en_route_to_pickup','waiting_passenger','on_trip')`.
- `driver:{id}:rides` — UPDATE filtrado por `driver_id={id}`.
- `passenger:{id}:rides` — filtrado por `passenger_id={id}`.

#### FCM — tipos de notificación

```
{
  "type": "ride_assigned" | "ride_accepted" | "ride_cancelled" | "driver_arrived" |
          "trip_started" | "trip_ended" | "doc_expiring" | "sos_triggered" |
          "system_announcement",
  "ride_id"?: string,
  "driver_id"?: string,
  "passenger_id"?: string,
  "metadata"?: {...}
}
```

## Cierre

Tag `tanda-3-done`. Demo posible: usuario pide remís en passenger, dispatcher lo ve aparecer en cola, asigna, driver lo recibe vía push, acepta, va a pickup, llega, inicia viaje, finaliza.
