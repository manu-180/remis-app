import StyleDictionary from 'style-dictionary';
import type { TransformedToken } from 'style-dictionary';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Name transform ──────────────────────────────────────────────────────────
function remisName(token: TransformedToken): string {
  const path = [...token.path];
  const last = path[path.length - 1];
  if (last === 'light' || last === 'dark') path.pop();
  const [cat, ...rest] = path;

  switch (cat) {
    case 'color': {
      const [sub, ...cr] = rest;
      switch (sub) {
        case 'brand':    return 'brand-' + cr.join('-').replace(/_/g, '-');
        case 'neutral':  return 'neutral-' + cr[0];
        case 'semantic': {
          const [name, variant] = cr;
          return variant === 'default' ? name! : `${name}-${variant}`;
        }
        case 'driver_status': return 'driver-status-' + cr[0]!.replace(/_/g, '-');
        case 'ride_status':   return 'ride-status-' + cr.join('-').replace(/_/g, '-');
        default: return [sub, ...cr].join('-').replace(/_/g, '-');
      }
    }
    case 'font': {
      const [fs, ...fr] = rest;
      switch (fs) {
        case 'family':         return `font-family-${fr[0]}`;
        case 'size':           return `text-${fr[0]!.replace(/_/g, '-')}`;
        case 'weight':         return `font-weight-${fr[0]}`;
        case 'line_height':    return `line-height-${fr[0]}`;
        case 'letter_spacing': return `letter-spacing-${fr[0]!.replace(/_/g, '-')}`;
        default: return [fs, ...fr].join('-');
      }
    }
    case 'space':      return `space-${rest[0]}`;
    case 'radius':     return `radius-${rest.join('-').replace(/_/g, '-')}`;
    case 'shadow':     return `shadow-${rest[0]}`;
    case 'motion': {
      const [ms, mn] = rest;
      if (ms === 'duration') return `dur-${mn}`;
      if (ms === 'easing')   return `ease-${mn!.replace(/_/g, '-')}`;
      return `${ms}-${mn}`;
    }
    case 'density':    return `density-${rest.join('-').replace(/_/g, '-')}`;
    case 'breakpoint': return `breakpoint-${rest[0]}`;
    case 'z_index':    return `z-${rest[0]}`;
    default: return path.join('-').replace(/_/g, '-');
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────
const isLight = (t: TransformedToken) => t.path[t.path.length - 1] !== 'dark';
const isDark  = (t: TransformedToken) => t.path[t.path.length - 1] === 'dark';

// ─── Style Dictionary CSS build ───────────────────────────────────────────────
mkdirSync(resolve(root, 'src/css'), { recursive: true });

const sd = new StyleDictionary({
  source: ['tokens.json'],
  hooks: {
    transforms: {
      'name/remis': { type: 'name', transform: remisName },
    },
    formats: {
      'css/remis': ({ dictionary }: { dictionary: any }) => {
        const all: TransformedToken[] = dictionary.allTokens;
        const decl = (t: TransformedToken) => `    --${t.name}: ${String(t.value)};`;

        const lightDecls = all.filter(isLight).map(decl).join('\n');
        const darkDecls  = all.filter(isDark).map(decl).join('\n');

        return [
          '@layer base {',
          '  :root {',
          lightDecls,
          '  }',
          '  [data-theme="dark"] {',
          darkDecls,
          '  }',
          '  @media (prefers-color-scheme: dark) {',
          '    :root:not([data-theme]) {',
          darkDecls.replace(/^    /gm, '      '),
          '    }',
          '  }',
          '  html {',
          '    font-family: var(--font-family-body);',
          '    font-size: var(--text-base);',
          '    line-height: var(--line-height-normal);',
          '    color: var(--neutral-800);',
          '    background: var(--neutral-0);',
          '    color-scheme: light dark;',
          '  }',
          '  *, *::before, *::after { box-sizing: border-box; }',
          '  body { margin: 0; -webkit-font-smoothing: antialiased; }',
          '}',
          '',
        ].join('\n');
      },
    },
    filters: {
      'light': { filter: isLight },
      'dark':  { filter: isDark },
    },
  },
  platforms: {
    css: {
      transforms: ['name/remis'],
      buildPath: 'src/css/',
      files: [{
        destination: 'tokens.css',
        format: 'css/remis',
      }],
    },
  },
});

await sd.buildAllPlatforms();
console.log('Built src/css/tokens.css');

// ─── Generate src/tokens.ts ──────────────────────────────────────────────────
const rawTokens = JSON.parse(readFileSync(resolve(root, 'tokens.json'), 'utf-8'));

function extractValues(node: Record<string, unknown>): unknown {
  if ('value' in node) return node['value'];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'object' && v !== null) {
      out[k] = extractValues(v as Record<string, unknown>);
    }
  }
  return out;
}

const tokenValues = extractValues(rawTokens);

const tokensTsContent = `// AUTOGENERATED — DO NOT EDIT. Run: pnpm -F @remis/design-system build:web
// Source of truth: tokens.json

export const tokens = ${JSON.stringify(tokenValues, null, 2)} as const;

export type Tokens = typeof tokens;

export type DriverStatus =
  | 'available'
  | 'en_route_to_pickup'
  | 'waiting_passenger'
  | 'on_trip'
  | 'on_break'
  | 'offline'
  | 'suspended';

export type RideStatus =
  | 'unassigned_urgent'
  | 'broadcasted'
  | 'in_assignment_window'
  | 'scheduled'
  | 'in_progress'
  | 'hold';

/** Returns a CSS var() reference. Example: cssVar('brand.primary') → 'var(--brand-primary)' */
export function cssVar(path: string): string {
  return \`var(--\${path.replace(/\\./g, '-')})\`;
}

export function getDriverStatusColor(
  status: DriverStatus,
  mode: 'light' | 'dark' = 'light',
): string {
  return tokens.color.driver_status[status][mode] as string;
}

export function getRideStatusBadge(
  status: RideStatus,
  mode: 'light' | 'dark' = 'light',
): { borderColor: string; bgColor: string } {
  const s = tokens.color.ride_status[status];
  return {
    borderColor: (s as any).border[mode] as string,
    bgColor: (s as any).bg[mode] as string,
  };
}
`;

writeFileSync(resolve(root, 'src/tokens.ts'), tokensTsContent);
console.log('Generated src/tokens.ts');

// ─── Generate src/tailwind-preset.ts ─────────────────────────────────────────
const spacingEntries = Object.keys(rawTokens.space as object)
  .map((k) => `    '${k}': 'var(--space-${k})',`)
  .join('\n');

const tailwindContent = `// AUTOGENERATED — DO NOT EDIT. Run: pnpm -F @remis/design-system build:web
import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        'brand-primary':       'var(--brand-primary)',
        'brand-primary-hover': 'var(--brand-primary-hover)',
        'brand-accent':        'var(--brand-accent)',
        'brand-accent-hover':  'var(--brand-accent-hover)',
        'neutral-0':   'var(--neutral-0)',
        'neutral-50':  'var(--neutral-50)',
        'neutral-100': 'var(--neutral-100)',
        'neutral-200': 'var(--neutral-200)',
        'neutral-300': 'var(--neutral-300)',
        'neutral-400': 'var(--neutral-400)',
        'neutral-500': 'var(--neutral-500)',
        'neutral-600': 'var(--neutral-600)',
        'neutral-700': 'var(--neutral-700)',
        'neutral-800': 'var(--neutral-800)',
        'neutral-900': 'var(--neutral-900)',
        'success':    'var(--success)',
        'success-bg': 'var(--success-bg)',
        'warning':    'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        'danger':     'var(--danger)',
        'danger-bg':  'var(--danger-bg)',
        'info':       'var(--info)',
        'info-bg':    'var(--info-bg)',
      },
      fontFamily: {
        display: ['var(--font-family-display)', 'Inter Tight', '-apple-system', 'sans-serif'],
        sans:    ['var(--font-family-body)',    'Inter',        '-apple-system', 'sans-serif'],
        mono:    ['var(--font-family-mono)',    'Geist Mono',   'monospace'],
      },
      fontSize: {
        '2xs': 'var(--text-2xs)',
        'xs':  'var(--text-xs)',
        'sm':  'var(--text-sm)',
        'base':'var(--text-base)',
        'md':  'var(--text-md)',
        'lg':  'var(--text-lg)',
        'xl':  'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
        '5xl': 'var(--text-5xl)',
      },
      spacing: {
${spacingEntries}
      },
      borderRadius: {
        'sm':   'var(--radius-sm)',
        'md':   'var(--radius-md)',
        'lg':   'var(--radius-lg)',
        'xl':   'var(--radius-xl)',
        '2xl':  'var(--radius-2xl)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      transitionDuration: {
        'instant':    'var(--dur-instant)',
        'fast':       'var(--dur-fast)',
        'normal':     'var(--dur-normal)',
        'slow':       'var(--dur-slow)',
        'deliberate': 'var(--dur-deliberate)',
      },
      transitionTimingFunction: {
        'out':    'var(--ease-out)',
        'in':     'var(--ease-in)',
        'in-out': 'var(--ease-in-out)',
        'spring': 'var(--ease-spring)',
      },
    },
  },
} satisfies Partial<Config>;
`;

writeFileSync(resolve(root, 'src/tailwind-preset.ts'), tailwindContent);
console.log('Generated src/tailwind-preset.ts');

console.log('\nBuild complete.');
