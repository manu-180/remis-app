# remis_app — Reglas para Claude

> Este archivo es leído automáticamente por Claude Code en cada sesión.
> Estas reglas tienen prioridad sobre cualquier comportamiento por defecto.

## 🌳 Workflow de Git: SIEMPRE en main, NUNCA en ramas

**Soy un desarrollador solo. No uso ramas. No uso pull requests. No uso worktrees.**

### Reglas estrictas

1. **Trabajar SIEMPRE en `main` directamente.** Todo cambio se commitea a `main`.
2. **NO crear branches** (ni `feature/...`, ni `fix/...`, ni nada). Si Claude propone una branch, decir "no, en main".
3. **NO usar `git worktree`.** Si Claude sugiere worktrees, rechazar — son confusos para mí y duplican el código.
4. **NO usar `git stash`** salvo que sea estrictamente para una pausa de 5 minutos. Preferir commits WIP a `main`.
5. **Push a `origin main` directo.** No PRs, no reviews.
6. **Commits frecuentes y pequeños** son OK. Si rompo algo, hago `git revert` del commit problemático.

### Si Claude detecta trabajo no trivial

- Hacer un commit en `main` antes de empezar (snapshot)
- Continuar trabajando en `main`
- Si algo sale mal: `git reset --hard <snapshot-commit>` o `git revert <commit-malo>`

### Comandos típicos

```bash
git add .
git commit -m "feat: descripción"
git push                       # push a origin main
```

### Recovery rápido si algo se rompe

```bash
git log --oneline -10          # ver commits recientes
git revert <hash>              # deshacer un commit específico (crea nuevo commit)
git reset --hard <hash>        # volver a un punto exacto (CUIDADO: pierde cambios sin commit)
```

---

## 📦 Stack y arquitectura

- **Monorepo:** pnpm workspaces + turbo
- **Apps Flutter:** `apps/driver`, `apps/passenger` (Riverpod, go_router)
- **Apps Next.js:** `apps/dispatcher` (port 3001), `apps/web` (port 3002)
- **Packages compartidos:** `packages/flutter-core`, `packages/design-system`, `packages/shared-types`
- **Backend:** Supabase (auth + DB + realtime + edge functions)

## 🔐 Variables de entorno

**Sistema unificado:** un solo `.env` en la raíz alimenta a todas las apps.

- `.env` (raíz, **gitignored**) → fuente de verdad con secretos reales
- `.env.example` → plantilla commiteable
- `pnpm env:sync` → genera derivados (Flutter `dev.json`, Next.js `.env.local`)
- `.vscode/launch.json` lo corre automático al apretar **Play**

Detalles completos: [docs/env-setup.md](docs/env-setup.md)

**Para correr una app desde Cursor:**
1. Run and Debug → seleccionar `driver (dev)` o `passenger (dev)` → Play
2. El `preLaunchTask` corre `sync-env` solo, no hay que hacer nada manual.

## 🚫 Cosas que NUNCA hacer

- Crear branches o PRs
- Crear worktrees (`git worktree add`)
- Commitear secretos (`.env`, `dev.json` con valores reales, claves, JWTs)
- Sugerir alternativas tecnológicas a Supabase, Flutter+Riverpod, Next.js (ver `~/.claude/CLAUDE.md` global)
- Hacer `git push --force` salvo que yo lo pida explícito
