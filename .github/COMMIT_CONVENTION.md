# Conventional Commits

Seguimos [Conventional Commits 1.0](https://www.conventionalcommits.org/). Los commits se escriben en **inglés**.

## Formato

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Types

| Type       | Cuándo usar                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | Nueva funcionalidad para el usuario                     |
| `fix`      | Bugfix                                                  |
| `chore`    | Mantenimiento (deps, configs, scripts)                  |
| `docs`     | Documentación                                           |
| `refactor` | Cambio de código sin alterar comportamiento             |
| `test`     | Agregar / modificar tests                               |
| `perf`     | Mejora de performance                                   |
| `ci`       | Cambios en CI/CD                                        |
| `build`    | Cambios en sistema de build / deps                      |
| `style`    | Formato (whitespace, semicolons) — sin cambio funcional |
| `revert`   | Revertir un commit anterior                             |

## Scopes preferidos

`driver`, `passenger`, `dispatcher`, `web`, `db`, `edge-fns`, `ds` (design system), `legal`, `brand`, `obs` (observability), `ci`, `tanda-N`.

## Ejemplos

```
feat(driver): add background location tracking with refresh-token strategy
fix(dispatcher): prevent double-assign on slow network
chore(tanda-0): bootstrap monorepo structure
docs(arch): close decision on PostGIS geography type
refactor(edge-fns): extract HMAC verify into _shared
ci(lint): add prettier format check on PRs
```

## Reglas

- **Subject** en imperativo presente, sin punto final, ≤ 72 chars.
- **Scope** en minúsculas, kebab-case.
- **Breaking change**: agregar `!` después del type/scope (`feat(api)!: ...`) y `BREAKING CHANGE:` en footer.
- **Issue refs** en footer: `Refs #123` o `Closes #123`.
- **Branch naming:** `tanda-N/<scope>-<short-desc>` (ej. `tanda-2/driver-skeleton`).
