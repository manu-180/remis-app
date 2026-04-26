# Tanda 4 — Premium polish

**Modo:** 4 prompts en paralelo.
**Duración estimada:** 6-10 horas cada sesión.
**Prerequisitos:** Tanda 3 completa (todo funciona pero no es premium aún).
**Salida:** la app **se siente premium** — animaciones milimetradas, micro-interacciones, sonidos, haptics, shortcuts completos del dispatcher, integración MP end-to-end. **Es la tanda que más impacta en la percepción del cliente.**

## Filosofía de esta tanda

> "Hacer que cada interacción se sienta deliberada." Pequeños detalles: cómo entra un toast, cómo se anima un marker, cómo responde un botón cuando se mantiene presionado, cómo el bottom sheet aterriza con spring controlado. **El usuario no debe poder decir por qué se siente premium — solo debe sentirlo.**

Cada prompt de esta tanda **referencia constantemente `00_design_language.md` sec 7 (Movimiento)** y aplica las curvas/duraciones/easings al detalle.

## Prompts paralelos

| ID | Archivo | Output |
|----|---------|--------|
| 4A | `prompt_4A_driver_premium.md` | Animaciones del flujo, sonido, haptics, chat conductor↔pasajero, mejoras UX |
| 4B | `prompt_4B_passenger_premium.md` | Animaciones de tracking, transiciones, ilustraciones, recibo visual |
| 4C | `prompt_4C_dispatcher_premium.md` | Shortcuts completos, Caller-ID Twilio, multi-monitor, command palette extendido |
| 4D | `prompt_4D_mp_integration.md` | MP end-to-end (driver cobra, passenger paga, webhook procesa, reconciliación) |

## File ownership

Ver `00_file_ownership_matrix.md`. **No se solapan**.

## Cierre

Demo cliente: presentar la app desde 0 — pasajero pide, recibe push, ve conductor llegar, paga con MP, recibe recibo. Despachante muestra cockpit. Conductor opera con guantes y manos sucias. Cierre con tag `tanda-4-done`.
