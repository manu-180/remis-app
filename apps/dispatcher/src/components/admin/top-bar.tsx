'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, Sun, Moon, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/* ── Label map ─────────────────────────────────────────────── */
const LABEL_MAP: Record<string, string> = {
  admin:           'Admin',
  drivers:         'Conductores',
  rides:           'Viajes',
  sos:             'SOS',
  zones:           'Zonas',
  fares:           'Tarifas',
  passengers:      'Pasajeros',
  payments:        'Pagos',
  kyc:             'KYC',
  'feature-flags': 'Feature Flags',
  audit:           'Audit Log',
  team:            'Equipo',
  settings:        'Settings',
};

function getLabel(segment: string): string {
  return LABEL_MAP[segment] ?? segment;
}

function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((seg, i) => {
    const href = i < segments.length - 1 ? '/' + segments.slice(0, i + 1).join('/') : undefined;
    return {
      label: getLabel(seg),
      ...(href !== undefined ? { href } : {}),
    };
  });
}

/* ── Avatar ─────────────────────────────────────────────────── */
function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ── Theme hook ─────────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = stored ?? 'dark';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.dataset.theme = next;
  };

  return { theme, toggle };
}

/* ── Props ──────────────────────────────────────────────────── */
interface TopBarProps {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  collapsed: boolean;
  onMenuClick: () => void;
  onSearch: () => void;
}

/* ── TopBar ─────────────────────────────────────────────────── */
export function TopBar({ profile, collapsed, onMenuClick, onSearch }: TopBarProps) {
  const breadcrumbs = useBreadcrumbs();
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [profileOpen]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = getInitials(profile.full_name);

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--glass-border)] px-4">
      {/* Hamburger — solo mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden focus-ring rounded-[var(--radius-md)] p-2 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumbs */}
      <div className="hidden sm:block flex-1 min-w-0">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className="flex-1 sm:hidden" />

      {/* Search */}
      <button
        onClick={onSearch}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        className={cn(
          'focus-ring hidden md:flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)]',
          'bg-[var(--neutral-50)] px-3 py-1.5 text-sm text-[var(--neutral-400)]',
          'hover:border-[var(--neutral-400)] transition-all duration-200',
          searchFocused ? 'w-64' : 'w-44'
        )}
        aria-label="Buscar"
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-[var(--neutral-200)] px-1.5 text-[10px] font-medium text-[var(--neutral-400)]">
          ⌘K
        </kbd>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] transition-colors duration-150"
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {theme === 'dark' ? (
          <Sun size={18} className="transition-transform rotate-0" />
        ) : (
          <Moon size={18} className="transition-transform rotate-180" />
        )}
      </button>

      {/* Profile */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setProfileOpen((o) => !o)}
          className="focus-ring flex items-center gap-2 rounded-[var(--radius-md)] p-1 hover:bg-[var(--neutral-100)] transition-colors duration-150"
          aria-label="Menú de perfil"
          aria-expanded={profileOpen}
        >
          {/* Avatar */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-bold text-white hover:scale-105 transition-transform duration-150 overflow-hidden">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <ChevronDown
            size={14}
            className={cn(
              'hidden sm:block text-[var(--neutral-400)] transition-transform duration-150',
              profileOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {profileOpen && (
          <div className="glass absolute right-0 top-full mt-2 w-56 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden z-50 animate-[fade-up_150ms_var(--ease-emphasized)]">
            {/* Profile info */}
            <div className="px-4 py-3 border-b border-[var(--neutral-200)]">
              <p className="text-sm font-medium text-[var(--neutral-900)] truncate">
                {profile.full_name ?? 'Administrador'}
              </p>
              <p className="text-xs text-[var(--neutral-500)] truncate">
                {profile.email ?? ''}
              </p>
            </div>

            {/* Items */}
            <div className="py-1">
              <button
                onClick={() => { setProfileOpen(false); router.push('/admin/team'); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors duration-100"
              >
                <User size={14} className="text-[var(--neutral-400)]" />
                Mi cuenta
              </button>
              <button
                onClick={() => { setProfileOpen(false); router.push('/admin/settings'); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors duration-100"
              >
                <Settings size={14} className="text-[var(--neutral-400)]" />
                Configuración
              </button>
            </div>

            <div className="border-t border-[var(--neutral-200)] py-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors duration-100"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
