import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function assert(cond: boolean, msg: string): void {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

const css = readFileSync(resolve(root, 'src/css/tokens.css'), 'utf-8');
assert(css.includes(':root'), 'tokens.css must have :root');
assert(css.includes('[data-theme="dark"]'), 'tokens.css must have dark selector');
assert(css.includes('--brand-primary'), 'tokens.css must have --brand-primary');
assert(css.includes('--neutral-0'), 'tokens.css must have --neutral-0');
assert(css.includes('--text-base'), 'tokens.css must have --text-base (not --font-size-base)');
assert(css.includes('--dur-fast'), 'tokens.css must have --dur-fast');
assert(css.includes('--ease-out'), 'tokens.css must have --ease-out');
assert(css.includes('--space-16'), 'tokens.css must have --space-16');
assert(css.includes('--shadow-xs'), 'tokens.css must have --shadow-xs');
assert(css.includes('prefers-color-scheme'), 'tokens.css must have prefers-color-scheme fallback');
assert(css.includes('#1B2A4E'), 'light --brand-primary must be #1B2A4E');
assert(css.includes('#7CA0FF'), 'dark --brand-primary must be #7CA0FF');

const ts = readFileSync(resolve(root, 'src/tokens.ts'), 'utf-8');
assert(ts.includes('export const tokens'), 'tokens.ts must export const tokens');
assert(ts.includes('as const'), 'tokens.ts must use as const');
assert(ts.includes('DriverStatus'), 'tokens.ts must export DriverStatus type');
assert(ts.includes('cssVar'), 'tokens.ts must export cssVar helper');
assert(ts.includes('getDriverStatusColor'), 'tokens.ts must export getDriverStatusColor');

const tw = readFileSync(resolve(root, 'src/tailwind-preset.ts'), 'utf-8');
assert(tw.includes('brand-primary'), 'tailwind-preset must have brand-primary color');
assert(tw.includes('var(--brand-primary)'), 'tailwind-preset must use CSS vars');
assert(tw.includes('fontFamily'), 'tailwind-preset must have fontFamily');

console.log('All web output checks passed.');
