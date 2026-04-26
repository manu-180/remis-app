# Prompt 1B — Design System: tokens, outputs, componentes base

> **LEÉ PRIMERO COMPLETO Y MÁS DE UNA VEZ:** `00_design_language.md`. Es la biblia de esta tarea. NO te alejes de los valores definidos ahí.
>
> También: `00_arquitectura.md` (sec 1, 3), `00_file_ownership_matrix.md` (Tanda 1B).

## Objetivo

Implementar el design system **production-grade** para que las apps de Tandas 2+ consuman tokens y componentes consistentes en web (Next.js / Tailwind) y mobile (Flutter / ThemeData). La SSOT es `tokens.json`; los demás artefactos se generan.

**NO improvises valores** que no estén en `00_design_language.md`. Si algo falta, documentalo en un comentario `// TODO design-language: ...` y seguí con un default razonable.

## File ownership

✍️ `packages/design-system/**`. NADA fuera.

## Estructura objetivo

```
packages/design-system/
├── tokens.json                 # SSOT en formato Style Dictionary
├── package.json
├── tsconfig.json
├── build/
│   ├── build.ts                # Style Dictionary config + custom transforms
│   └── flutter_build.dart      # genera tokens.dart desde tokens.json
├── src/
│   ├── index.ts                # exports TS
│   ├── tokens.ts               # tipado fuerte de los tokens
│   ├── tailwind-preset.ts      # preset Tailwind v4 consumible
│   └── css/
│       ├── tokens.css          # CSS variables (light + dark)
│       └── reset.css           # reset opinionated
├── flutter/
│   └── lib/
│       ├── design_system.dart  # entrypoint Dart
│       ├── tokens.dart         # generado por build script
│       ├── theme.dart          # ThemeData light + dark
│       └── widgets/            # primitives (RButton, RInput, RCard, ...)
└── README.md
```

## Steps

### 1. `tokens.json` (SSOT)

Estructura Style Dictionary. Categorías top-level:
- `color`
  - `brand` (primary, primary-hover, accent, accent-hover) light/dark
  - `neutral` (escala 0–900) light/dark
  - `semantic` (success, warning, danger, info) cada uno con `default` y `bg` light/dark
  - `driver_status` (mapeo de estados a colores)
  - `ride_status` (mapeo de estados a colores)
- `font`
  - `family` (display, body, mono)
  - `size` (2xs..5xl)
  - `weight` (regular, medium, semibold, bold)
  - `line_height` (tight, snug, normal, relaxed)
  - `letter_spacing` (tight, normal, wide, wider)
- `space` (0..128)
- `radius` (sm, md, lg, xl, 2xl, full)
- `shadow` (xs..xl) light/dark separados
- `motion`
  - `duration` (instant, fast, normal, slow, deliberate)
  - `easing` (out, in, in-out, spring)
- `density` (comfortable, compact, dense — con valores de row-height/padding)
- `breakpoint` (sm, md, lg, xl, 2xl)
- `z_index` (base, sticky, dropdown, modal, popover, toast, tooltip)

**Cada token con descripción** (`description` field) que cite el uso. Ej:
```json
"brand": {
  "primary": {
    "light": { "value": "#1B2A4E", "description": "Identidad, headers, links primarios. Azul medianoche profundo." },
    "dark":  { "value": "#7CA0FF", "description": "Versión dark — más clara para contraste sobre fondo oscuro." }
  }
}
```

**Calibrar la escala neutral con OKLCH** internamente — si Style Dictionary recibe hex, convertir mediante un transform custom para garantizar pasos perceptualmente uniformes (verificar con alguna lib como `culori`).

### 2. `package.json`

```json
{
  "name": "@remis/design-system",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tailwind": "./src/tailwind-preset.ts",
    "./css": "./src/css/tokens.css"
  },
  "files": ["src", "flutter", "tokens.json"],
  "scripts": {
    "build": "tsx build/build.ts && dart run build/flutter_build.dart",
    "build:web": "tsx build/build.ts",
    "build:flutter": "dart run build/flutter_build.dart",
    "dev": "tsx watch build/build.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "devDependencies": {
    "style-dictionary": "^4.2.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "culori": "^4.0.1"
  }
}
```

### 3. `build/build.ts`

Style Dictionary config:
- Plataforma `css` → `src/css/tokens.css` con `:root` (light) + `[data-theme="dark"]` (dark).
- Plataforma `ts` → `src/tokens.ts` con const objects + types.
- Custom transform `name/cti/kebab` → `--brand-primary-default`.
- Para dark: registrar segunda config con `selector: '[data-theme="dark"]'`.
- Genera también `src/tailwind-preset.ts` que importa los tokens y arma `theme.extend.colors`, `fontSize`, `spacing`, `borderRadius`, `boxShadow`, `transitionDuration`, `transitionTimingFunction`.

### 4. `src/tokens.ts` (tipado)

Después del build, `tokens.ts` debe exportar:
```ts
export const tokens = {
  color: { brand: { primary: { light: '#1B2A4E', dark: '#7CA0FF' }, ... }, ... },
  // ...
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof Tokens['color'];
// etc.
```

Helpers:
- `cssVar('brand.primary')` → `'var(--brand-primary)'`
- `getDriverStatusColor(status: DriverStatus)` → token
- `getRideStatusBadge(status: RideStatus)` → `{ borderColor, bgColor }`

### 5. `src/css/tokens.css`

Bloque generado. Incluir un `@layer base` con tipografía base:

```css
@layer base {
  :root {
    --brand-primary: #1B2A4E;
    /* ...todos los tokens... */
  }
  [data-theme="dark"] {
    --brand-primary: #7CA0FF;
    /* ... */
  }
  html {
    font-family: var(--font-family-body);
    font-size: var(--text-base);
    line-height: var(--line-height-normal);
    color: var(--neutral-800);
    background: var(--neutral-0);
    color-scheme: light dark;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; -webkit-font-smoothing: antialiased; }
}
```

`reset.css` aparte: reset opinionated tipo Andy Bell — bordes, márgenes default, etc.

### 6. `src/tailwind-preset.ts`

Preset Tailwind v4 (CSS-first):
```ts
import type { Config } from 'tailwindcss';
import { tokens } from './tokens';

export default {
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--brand-primary)',
        'brand-accent': 'var(--brand-accent)',
        // ... map todos
      },
      fontFamily: {
        display: ['var(--font-family-display)', 'sans-serif'],
        sans: ['var(--font-family-body)', 'sans-serif'],
        mono: ['var(--font-family-mono)', 'monospace'],
      },
      // spacing, radius, shadow, etc.
    },
  },
} satisfies Partial<Config>;
```

### 7. `build/flutter_build.dart`

Script Dart que parsea `tokens.json` y emite `flutter/lib/tokens.dart`:

```dart
// AUTOGENERATED — DO NOT EDIT
import 'dart:ui';

class RTokens {
  RTokens._();

  // Brand
  static const brandPrimaryLight = Color(0xFF1B2A4E);
  static const brandPrimaryDark = Color(0xFF7CA0FF);
  // ...

  // Spacing
  static const space0 = 0.0;
  static const space2 = 2.0;
  // ...

  // Radius
  static const radiusSm = 4.0;
  // ...

  // Motion
  static const durFast = Duration(milliseconds: 150);
  // ...
}
```

### 8. `flutter/lib/theme.dart`

Construye `ThemeData` light y dark consumiendo `RTokens`:

```dart
ThemeData buildLightTheme() => ThemeData(
  brightness: Brightness.light,
  colorScheme: const ColorScheme.light(
    primary: RTokens.brandPrimaryLight,
    onPrimary: Color(0xFFFFFFFF),
    secondary: RTokens.brandAccentLight,
    surface: RTokens.neutral0Light,
    onSurface: RTokens.neutral800Light,
    error: RTokens.dangerLight,
    // ...
  ),
  textTheme: _buildTextTheme(brightness: Brightness.light),
  inputDecorationTheme: _buildInputTheme(...),
  filledButtonTheme: _buildButtonTheme(...),
  cardTheme: CardTheme(elevation: 0, color: RTokens.neutral100Light, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RTokens.radiusLg))),
  // ...
  pageTransitionsTheme: const PageTransitionsTheme(builders: {
    TargetPlatform.android: _PremiumPageTransitionsBuilder(),
    TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
  }),
);
```

`_buildTextTheme` mapea Material text styles a la escala definida en `00_design_language.md` sec 3.

Cargar fuentes con `google_fonts` (Inter, Inter Tight, Geist Mono) en `pubspec` del package — será una dependencia transitiva de driver/passenger.

### 9. `flutter/lib/widgets/` (primitives)

Componentes Dart con la estética premium:

- **`RButton`** — variantes `primary | accent | secondary | ghost | destructive`, sizes `sm | md | lg | xl`, soporte loading state, icon leading/trailing, full-width opcional. Ripple custom (más sutil que el default Material).
- **`RInput`** — label arriba, helper, error states, prefix/suffix slots, autofocus correcto, `keyboardType` por contexto (phone, email, number).
- **`RCard`** — `padding`, `elevation` (0|1|2 que mapean a sombras), `onTap` opcional con highlight.
- **`RBadge`** — variantes semánticas + soporte custom color.
- **`RDriverStatusPill`** — píldora con dot + label que mapea estado a color.
- **`RBottomSheet`** — implementa los 3 stops (collapsed/half/full) con `DraggableScrollableSheet` y handle visual (44×4 px).
- **`RAppBar`** — translúcido sobre mapa, fondo blureado.
- **`RSosButton`** — hold-press 2s con countdown visual, pulse animation, color `--danger`. Triggea callback al completar.
- **`RIconButton`** — variantes mínimas pero hit-target ≥44.
- **`RDivider`**, **`RSkeletonLoader`**, **`RToast`** (con `Overlay`).

**Cada widget en su file separado**, con tests visuales en `test/widgets/` (Tanda 5C los completará — acá solo dejá los archivos `_test.dart` con `// TODO golden tests`).

### 10. `flutter/pubspec.yaml`

```yaml
name: remis_design_system
description: Design system shared by driver and passenger Flutter apps.
publish_to: none
version: 0.0.0

environment:
  sdk: ^3.5.0
  flutter: ^3.27.0

dependencies:
  flutter:
    sdk: flutter
  google_fonts: ^6.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
```

### 11. `flutter/lib/design_system.dart`

```dart
library remis_design_system;

export 'tokens.dart';
export 'theme.dart';
export 'widgets/r_button.dart';
export 'widgets/r_input.dart';
// ...
```

### 12. README de uso

`packages/design-system/README.md`:
- Cómo importar en Next.js (Tailwind preset).
- Cómo importar en Flutter (`dependencies: { remis_design_system: { path: ... } }`).
- Cómo regenerar después de cambiar `tokens.json` (`pnpm build`).
- Qué NO hacer (no usar hex directo, no inventar valores intermedios).

### 13. Showcase página (opcional pero recomendado)

`packages/design-system/showcase.html` (estático) o un README con screenshots de cada componente. Si das un paso extra: una mini app Storybook-like solo para componentes Flutter con `flutter run -t lib/showcase_main.dart` mostrando todos los widgets en grid. **Si no llegás, dejá `// TODO showcase` y seguí.**

## Acceptance criteria

- [ ] `pnpm -F @remis/design-system build` corre sin errores y emite `tokens.css`, `tokens.ts`, `tailwind-preset.ts`, `flutter/lib/tokens.dart`.
- [ ] Importar `@remis/design-system/tailwind` en un proyecto vacío Next.js → al usar `bg-brand-primary` el color es exacto al token.
- [ ] Crear un proyecto Flutter mínimo, importar `remis_design_system`, aplicar `theme: buildLightTheme()` → `RButton` y `RInput` se renderizan según specs.
- [ ] Light + Dark switch (toggle `data-theme` en CSS, `Brightness` en Flutter) cambia los valores correctos.
- [ ] Cero hex hardcodeado en los archivos de UI (todos vienen de tokens).
- [ ] Commit `feat(ds): tokens + tailwind preset + flutter primitives`.

## Notas

- **Inter Tight** y **Geist Mono** existen en Google Fonts; verificar antes de empezar. Si Geist Mono no está como Variable: fallback a JetBrains Mono o IBM Plex Mono (decidir y documentar).
- **OKLCH calibration:** la escala neutral debe verse perceptualmente uniforme; si los pasos se sienten saltones, ajustar usando OKLCH lightness en pasos de 5%.
- **Cuidado con build order:** Style Dictionary corre primero (genera CSS+TS); el build Dart corre después y lee `tokens.json` directamente (no depende del output JS).
- **Dark mode en CSS:** preferí `[data-theme="dark"]` sobre `prefers-color-scheme` para que sea controlable. Tener un fallback `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { ... } }`.

## Out of scope

- Componentes "completos" complejos (timeline de viaje, mapa wrapper) — eso pertenece a las apps consumidoras.
- shadcn/ui adapt — los apps Next.js van a instalar shadcn aparte y aplicar nuestros tokens via Tailwind preset.
