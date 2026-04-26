# Prompt 4C — Dispatcher: shortcuts completos, Caller-ID, multi-monitor, polish

> **LEÉ:** `00_design_language.md` (sec 6, 8, 9), `00_arquitectura.md` (sec 2.4), `00_file_ownership_matrix.md`.

## Objetivo

Convertir el dispatcher de Tanda 3C (funcional) en una herramienta **profesional para 8h de trabajo**: todos los shortcuts del informe operativos, Caller-ID (Twilio Voice JS) que autocompleta el form al recibir llamada, modo multi-monitor con ventana secundaria de mapa fullscreen, command palette con acciones reales, micro-detalles que un dispatcher experimentado de TaxiCaller/Autocab/iCabbi reconozca como "esto está bien hecho".

## File ownership

✍️ `apps/dispatcher/src/features/**` (refinar), `apps/dispatcher/src/components/**` (extender), `apps/dispatcher/src/hooks/**`, `apps/dispatcher/public/**` (sonidos).

## Steps

### 1. Sistema de shortcuts completo

`hooks/use-app-shortcuts.ts` centraliza todos los atajos. Lista canónica (ya en `00_arquitectura.md` 2.4):

| Tecla | Acción | Contexto |
|-------|--------|----------|
| `Espacio` | Focus form de nuevo pedido | Global |
| `F1` | Guardar form | Form abierto |
| `F2` | Focus pickup; segundo press → destino | Form abierto |
| `F3` | Focus teléfono | Form abierto |
| `F5` | Toggle ahora/programado | Form abierto |
| `Enter` | Acción default del foco | Contexto-sensitive |
| `A` | Asignar pedido seleccionado | Pedido seleccionado |
| `M` | Designar manualmente | AssignPanel abierto |
| `E` | Editar pedido | Detail modal abierto |
| `C` | Cancelar pedido | Detail modal abierto |
| `H` | Hold pedido | Detail modal abierto |
| `R` | Reasignar | Detail modal abierto |
| `S` o `Cmd/Ctrl+K` | Command palette / búsqueda | Global |
| `F9` | Mensaje al chofer | Chofer seleccionado |
| `Tab` | Ciclar paneles (Left → Center → Right) | Global |
| `Shift+Tab` | Ciclar reverso | Global |
| `Esc` | Cerrar modal/panel/limpiar form | Contexto |
| `Ctrl+Z` | Deshacer última asignación (window 30s) | Global |
| `Cmd/Ctrl+1/2/3` | Cambiar densidad | Global |
| `Cmd/Ctrl+D` | Toggle dark/light | Global |
| `?` | Modal con todos los shortcuts | Global |
| `1`–`9` | Seleccionar sugerido N | AssignPanel abierto |
| `[`/`]` | Navegar pedidos en cola | Global |

Implementación con `react-hotkeys-hook` y `enabled` flags por contexto.

**Conflicto con browser**: F5 default es reload. Capturar con `event.preventDefault()` y warning si el dispatcher intenta refresh con Ctrl+R (que use el reconnect button).

### 2. Modal de shortcuts (`?`)

Tabla compacta agrupada por categoría: Cola, Form, Asignación, Navegación, Sistema. Buscable.

### 3. Undo de asignación

Sistema de undo:
- Después de `assign_ride` exitoso → guarda en stack local (Zustand `useUndoStore`) por 30s.
- Toast con "Deshacer" botón visible 30s.
- `Ctrl+Z` en cualquier momento dentro de la window → ejecuta `unassign_ride` RPC.
- Clear stack al pasar 30s.
- Solo soporta UN nivel de undo (no historia).

### 4. Caller-ID con Twilio Voice JS SDK

**Setup backend** (Edge Function `twilio-token`):
- Usuario dispatcher autenticado solicita capability token.
- Edge Function genera Twilio AccessToken con `VoiceGrant` (incoming).
- Token retornado al cliente válido 1h.

**Setup Twilio cuenta** (documentar en `apps/dispatcher/docs/twilio-setup.md`):
- Adquirir número argentino (+54).
- TwiML App apuntando a webhook (Edge Function `twilio-incoming`).
- Configurar voice URL.
- Whitelist por país (AR + países vecinos para roaming).

**Cliente Web**:
```ts
import { Device } from '@twilio/voice-sdk';
const device = new Device(token);
device.on('incoming', (call) => {
  const fromNumber = call.parameters.From; // +54...
  notifyIncomingCall(fromNumber);
});
```

**Componente `<IncomingCallBanner>`**:
- Aparece arriba al recibir llamada.
- Muestra: número, nombre del pasajero si match, último viaje, dirección habitual.
- Botones: "Atender" / "Rechazar".
- Atender: `call.accept()`, audio en navegador (WebRTC), banner se transforma en mini panel con timer + botón "Colgar".

**Auto-fill del form**:
- Al recibir llamada (incluso antes de atender), match de `phone` contra `passengers`.
- Si match: pre-llena `nuevo pedido` con nombre, teléfono, frecuente.
- Resaltar el form animadamente para indicar que se llenó solo.
- Si no match: solo pre-llena teléfono.

**Histórico**:
- Tabla nueva `phone_calls`: `id, from_number, dispatcher_id, started_at, ended_at, duration_s, ride_created_id, recording_url (opcional)`.
- Card en bottom bar muestra "Última llamada: hace 2 min — María Pérez".

**Modo no-call**:
- Si Twilio no está configurado o el feature flag `caller_id_enabled=false`, el SDK no se inicializa.
- UI no muestra incoming banner.

### 5. Multi-monitor

#### Ventana secundaria de mapa fullscreen

Ruta `/dispatch/map-fullscreen` que renderiza solo el mapa con todos los markers, sin sidebar.

`window.open('/dispatch/map-fullscreen', 'dispatch-map', 'width=1920,height=1080')` desde top bar (botón "Ventana mapa").

**Sincronización entre ventanas**:
- `BroadcastChannel('dispatch-sync')` para eventos UI (selección de chofer, ride, zoom).
- `postMessage` para acciones que requieren confirmación (asignación).
- Cada ventana abre su propio Realtime singleton (Supabase ya soporta múltiples conexiones).

UX:
- Click en chofer en ventana 2 → resalta también en ventana 1.
- Asignar ride: la asignación se hace en ventana 1 (form principal), ventana 2 solo visualiza.

#### Modo "vista única" en tablet

Para casos donde el dispatcher solo tiene 1 monitor + 1 tablet auxiliar:
- Layout responsive: cuando `width < 1280`, columnas se compactan.
- `width < 768` (tablet): right column se vuelve drawer accesible con tab.

### 6. Command palette extendido

`Cmd/Ctrl+K` con secciones:

```
> _________________________

Pasajeros
  María Pérez · 02954-555-1234
  Juan García · 02954-555-9876

Pedidos activos
  #1234 — Centenario 1234 → Plaza
  #1235 — ...

Choferes
  Mateo R. · Móvil 12 (Disponible)
  Carlos · Móvil 17 (En viaje)

Acciones
  ⚡ Nuevo pedido (Espacio)
  ⏸ Pausar nuevos pedidos
  📊 Ver reportes del día
  🌙 Cambiar a modo claro (Cmd+D)
  🚪 Cerrar sesión

Navegación
  → Vista mapa
  → Vista zonas
  → Lista pedidos completa
```

Buscador full-text en pasajeros (nombre + teléfono), pedidos (id, dirección), choferes (móvil + nombre).

Implementación con `cmdk` y filtrado fuzzy.

### 7. Polish del flujo de asignación

#### Sugeridos con info enriquecida

```
┌─────────────────────────────────┐
│ 1. ★ 12 Mateo Rodríguez         │
│    1.2km · 3min · Sedán         │
│    Libre desde 14:20 (12 min)  │
│    ⭐ 4.9 · 1834 viajes          │
│                                 │
│ 2.   17 Carlos                  │
│    1.8km · 4min · Sedán         │
│    Libre desde 14:25 (7 min)   │
│    ⭐ 4.8                        │
│                                 │
│ 3.   23 Ezequiel                │
│    2.1km · 5min · Suv           │
│    Libre desde 14:18 (14 min)  │
│    ⭐ 4.7                        │
└─────────────────────────────────┘
```

Highlight automático del más recomendado (factor distancia + tiempo libre + rating).

Atajo `1`/`2`/`3` selecciona y `Enter` confirma.

#### Drag & drop opcional

`@dnd-kit/core`: arrastrar card de pedido sobre marker de chofer en mapa → confirma asignación.

### 8. Sonidos del dispatcher

`public/sounds/`:
- `pedido_nuevo.mp3` — ding suave 200ms cuando entra requested.
- `pedido_programado_proximo.mp3` — campana suave a 15min de scheduled.
- `chofer_offline_inesperado.mp3` — alerta corta cuando un chofer pierde heartbeat.
- `sos.mp3` — sirena fuerte loop (mute requiere acción).

Volumen configurable en settings; `localStorage` persiste. Default: 60%.

Web Audio API con `<audio>` HTML elements. Los browser bloquean autoplay sin gesto del usuario — al primer click registramos los audios para uso posterior.

### 9. Notificaciones del navegador

Permiso al iniciar sesión. Notificaciones críticas:
- Nuevo pedido entrante (si pestaña no enfocada).
- SOS triggered.
- Driver heartbeat lost.
- Programado próximo.

Tap en notificación → focus tab + acción correspondiente.

### 10. Anomalías y alertas

Bottom bar `<AlertsBar>`:
- Driver offline inesperado: "Móvil 12 sin señal hace 7 min".
- Rate de cancelaciones alto: "5 cancelaciones en última hora".
- Pedido no asignable: "#1240 sin chofer hace 8 min".

Click en alerta → acción contextual.

### 11. Reportes en vivo (sidebar mini)

Dropdown desde top bar "Hoy":
- Viajes: 47 hechos / 3 cancelados.
- Ingresos: $58.400 (efectivo) / $12.300 (MP).
- Choferes activos: 8 / 12.
- Tiempo promedio de asignación: 1m 23s.
- Tiempo promedio de espera al pickup: 4m 12s.

Datos calculados en `useDailyStatsQuery` con cache de 60s.

### 12. Density tuning

Las 3 densidades probadas con dispatcher real (foto de cliente):
- `dense` debería caber **15+ choferes y 12+ pedidos** simultáneamente sin scroll en monitor 1440×900.
- Probar con datos reales de seed.

### 13. Backup state local

Si la web se cae (refresh accidental), el state crítico (pedido en curso de carga, search abierto) persiste en `sessionStorage` y se recupera al recargar.

`zustand/middleware` con `persist`.

### 14. "Lock screen" del dispatcher

Botón en top bar "Bloquear" → overlay full-screen con reloj + login para desbloquear (re-autenticación). Útil cuando el dispatcher se aleja del puesto.

Atajo `Cmd/Ctrl+L`.

### 15. Audit visual

En cada acción crítica (assign, unassign, cancel) → INSERT a `audit_log` (lo hace la RPC backend, pero verificar que el `actor_id` y `actor_role` se estén pasando).

Vista admin "Audit log" en `/reports/audit` (placeholder).

## Acceptance criteria

- [ ] Todos los shortcuts del listado funcionan en su contexto.
- [ ] Modal `?` muestra tabla completa.
- [ ] Caller-ID detecta llamada entrante, muestra banner, autollena form.
- [ ] Multi-monitor: ventana secundaria sincroniza estado con ventana principal.
- [ ] Command palette con secciones reales encuentra entidades.
- [ ] Drag & drop de asignación funciona.
- [ ] Sonidos configurables, no automáticos sin gesto.
- [ ] Notificaciones navegador con permiso explícito.
- [ ] Reportes en vivo en dropdown actualiza cada minuto.
- [ ] Probar con dispatcher (cliente o simulado): 30 min de uso continuo sin abrir teclado virtual ni mouse innecesariamente.
- [ ] Commit `feat(dispatcher): shortcuts, caller-id, multi-monitor, premium polish`.

## Out of scope

- Reportes históricos completos (Tanda 5).
- Bidding mode / Cab Exchange (anti-pattern, no implementar).
- Auto-dispatch agresivo (anti-pattern, no implementar).
- AI demand prediction (overkill para flota chica).

## Notas

- **Twilio costos:** ~USD 1/mes por número AR + ~USD 0.013/min de llamadas entrantes. Gratis en development con trial.
- **Doble click vs Enter:** acción primaria es Enter, doble-click como alternativa para mouse-users. NO removas el doble-click pensando que "los pros usan teclado" — los nuevos usan mouse al inicio.
- **No usar `confirm()` nativo del navegador.** Cualquier confirmación va por modal del DS.
