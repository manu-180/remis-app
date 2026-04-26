# Tanda 0 — Fundación del Monorepo

**Modo:** secuencial (1 sola sesión).
**Duración estimada:** 1-2 horas.
**Prerequisitos:** ninguno.
**Salida:** estructura raíz lista para que las Tandas 1+ corran en paralelo sin chocarse.

## Prompts

| ID | Archivo | Owner |
|----|---------|-------|
| 0A | `prompt_0A_monorepo_setup.md` | sesión única |

## Cierre

Al terminar:
- `pnpm install` corre sin errores en root.
- `pnpm -r run typecheck` pasa (no hay paquetes aún, pero el comando existe).
- Commit con mensaje `chore(tanda-0): bootstrap monorepo structure`.
- Tag `tanda-0-done`.
