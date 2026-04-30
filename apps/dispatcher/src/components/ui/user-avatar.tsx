'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Premium UserAvatar
// ---------------------------------------------------------------------------
// - Iniciales tipográficamente prolijas (mismo nombre → siempre mismas)
// - Gradiente determinístico por nombre (paleta brand-friendly)
// - Soft inner highlight + ring contextual opcional
// - Fallback elegante si la imagen falla o el avatar_url es un placeholder
//   tipo `ui-avatars.com` / `dicebear` (que rinden el nombre completo y
//   quedan feos en círculos chicos).
// ---------------------------------------------------------------------------

const SIZE_PRESETS = {
  xs: { box: 'h-6 w-6', text: 'text-[9px]', tracking: 'tracking-tight' },
  sm: { box: 'h-7 w-7', text: 'text-[10px]', tracking: 'tracking-tight' },
  md: { box: 'h-10 w-10', text: 'text-sm', tracking: 'tracking-tight' },
  lg: { box: 'h-14 w-14', text: 'text-lg', tracking: 'tracking-tight' },
  xl: { box: 'h-24 w-24', text: 'text-3xl', tracking: 'tracking-tight' },
} as const;

export type UserAvatarSize = keyof typeof SIZE_PRESETS;

// Paletas premium — gradientes oklab calibrados sobre los tokens del sistema.
// Las elegimos para que tengan suficiente contraste con texto blanco y vibren
// junto al brand sin chocar con el color del status ring.
const PALETTES: { from: string; to: string }[] = [
  { from: '#1B2A4E', to: '#3B4F88' }, // brand navy
  { from: '#0F766E', to: '#14B8A6' }, // teal
  { from: '#7C3AED', to: '#A855F7' }, // violet
  { from: '#B45309', to: '#F59E0B' }, // amber (brand accent vibe)
  { from: '#0369A1', to: '#0EA5E9' }, // sky
  { from: '#BE185D', to: '#EC4899' }, // rose
  { from: '#15803D', to: '#22C55E' }, // emerald
  { from: '#9333EA', to: '#D946EF' }, // fuchsia
  { from: '#1E40AF', to: '#3B82F6' }, // blue
  { from: '#A16207', to: '#EAB308' }, // gold
  { from: '#4338CA', to: '#6366F1' }, // indigo
  { from: '#155E75', to: '#06B6D4' }, // cyan
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const FALLBACK_PALETTE = { from: '#1B2A4E', to: '#3B4F88' };

function paletteFor(seed: string) {
  if (!seed) return FALLBACK_PALETTE;
  return PALETTES[hashString(seed) % PALETTES.length] ?? FALLBACK_PALETTE;
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase() || '?';
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?';
}

// URLs de servicios que pre-renderizan el nombre como imagen — quedan mal en
// círculos chicos y rompen la sensación premium. Si detectamos una, ignoramos
// el avatar_url y mostramos las iniciales con gradiente.
const PLACEHOLDER_HOSTS = [
  'ui-avatars.com',
  'api.dicebear.com',
  'avatars.dicebear.com',
  'eu.ui-avatars.com',
];

function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return PLACEHOLDER_HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: UserAvatarSize;
  /** Tailwind ring class: `'ring-[var(--success)]'` etc. */
  ringClass?: string;
  /** Width of the status ring in px (default 4 for xl, 2 otherwise). */
  ringWidth?: number;
  className?: string;
  /** Override the seed used to pick the gradient (default: `name`). */
  seed?: string;
}

export function UserAvatar({
  name,
  src,
  size = 'md',
  ringClass,
  ringWidth,
  className,
  seed,
}: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const preset = SIZE_PRESETS[size];

  const showImage =
    !!src && !errored && !isPlaceholderUrl(src);

  const palette = useMemo(
    () => paletteFor(seed ?? name ?? ''),
    [seed, name],
  );

  const initials = useMemo(() => computeInitials(name ?? ''), [name]);

  const ringStyle = ringWidth
    ? { boxShadow: `0 0 0 ${ringWidth}px rgb(var(--tw-ring-color) / 1)` }
    : undefined;

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-full overflow-hidden select-none',
        'shadow-[var(--shadow-sm)]',
        preset.box,
        ringClass && `ring-2 ${ringClass}`,
        size === 'xl' && ringClass && 'ring-4',
        className,
      )}
      style={ringStyle}
      aria-label={name}
      role="img"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          draggable={false}
        />
      ) : (
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          }}
        >
          {/* Specular highlight para dar profundidad/glassy look */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 80% at 30% 20%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 55%)',
            }}
          />
          <span
            className={cn(
              'relative font-semibold text-white',
              preset.text,
              preset.tracking,
            )}
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.18)',
            }}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
