'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard, Radio, AlertTriangle, MapPin, Car, Users,
  CreditCard, Map, DollarSign, ShieldCheck, Flag, BookOpen,
  UserCog, Settings, X, Zap, Palette, HelpCircle, LogOut,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard, shortcut: 'G D' },
  { href: '/',                    label: 'Despacho live',  icon: Radio },
  { href: '/admin/sos',           label: 'SOS',            icon: AlertTriangle,   shortcut: 'G S' },
  { href: '/admin/rides',         label: 'Viajes',         icon: MapPin,          shortcut: 'G V' },
  { href: '/admin/drivers',       label: 'Conductores',    icon: Car,             shortcut: 'G C' },
  { href: '/admin/passengers',    label: 'Pasajeros',      icon: Users },
  { href: '/admin/payments',      label: 'Pagos',          icon: CreditCard },
  { href: '/admin/zones',         label: 'Zonas',          icon: Map },
  { href: '/admin/fares',         label: 'Tarifas',        icon: DollarSign },
  { href: '/admin/kyc',           label: 'KYC',            icon: ShieldCheck },
  { href: '/admin/feature-flags', label: 'Feature Flags',  icon: Flag },
  { href: '/admin/audit',         label: 'Audit Log',      icon: BookOpen },
  { href: '/admin/team',          label: 'Equipo',         icon: UserCog },
  { href: '/admin/settings',      label: 'Settings',       icon: Settings },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const setTheme = useUIStore((s) => s.setTheme);
  const setDensity = useUIStore((s) => s.setDensity);
  const toggleShortcutHelp = useUIStore((s) => s.toggleShortcutHelp);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onOpenChange]);

  if (!open) return null;

  const QUICK_ACTIONS = [
    {
      label: 'Nuevo conductor',
      shortcut: '',
      action: () => { router.push('/admin/drivers'); onOpenChange(false); },
    },
    {
      label: 'Buscar pasajero por teléfono',
      shortcut: '',
      action: () => { router.push('/admin/passengers'); onOpenChange(false); },
    },
    {
      label: 'Ir a SOS activo',
      shortcut: '',
      action: () => { router.push('/admin/sos'); onOpenChange(false); },
    },
  ];

  const APPEARANCE_ITEMS = [
    { label: 'Tema: Claro',         action: () => { setTheme('light'); onOpenChange(false); } },
    { label: 'Tema: Oscuro',        action: () => { setTheme('dark'); onOpenChange(false); } },
    { label: 'Densidad: Confortable', action: () => { setDensity('comfortable'); onOpenChange(false); } },
    { label: 'Densidad: Compacta',  action: () => { setDensity('compact'); onOpenChange(false); } },
    { label: 'Densidad: Densa',     action: () => { setDensity('dense'); onOpenChange(false); } },
  ];

  const HELP_ITEMS = [
    {
      label: 'Atajos de teclado',
      action: () => { toggleShortcutHelp(); onOpenChange(false); },
    },
    {
      label: 'Soporte',
      action: () => { window.open('mailto:soporte@remisdespacho.com'); onOpenChange(false); },
    },
  ];

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const groupHeadingClass =
    '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--neutral-500)] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide';

  const itemClass =
    'flex cursor-pointer items-center gap-3 mx-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-[var(--neutral-900)] aria-selected:bg-[var(--neutral-100)] hover:bg-[var(--neutral-100)] transition-colors duration-100';

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[18vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div className="glass relative z-10 w-full max-w-[640px] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden animate-[fade-up_180ms_var(--ease-emphasized)]">
        <Command>
          <div className="flex items-center border-b border-[var(--neutral-200)] px-4">
            <Command.Input
              placeholder="Buscar… ⌘K"
              autoFocus
              className="flex-1 py-4 text-base bg-transparent outline-none placeholder:text-[var(--neutral-400)] text-[var(--neutral-900)]"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-[var(--radius-md)] p-1 text-[var(--neutral-400)] hover:text-[var(--neutral-700)] transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          <Command.List className="max-h-[480px] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--neutral-500)]">
              Sin resultados para esta búsqueda. Intentá con menos palabras.
            </Command.Empty>

            {/* Group 1: Ir a */}
            <Command.Group heading="Ir a" className={groupHeadingClass}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => {
                      router.push(item.href);
                      onOpenChange(false);
                    }}
                    className={itemClass}
                  >
                    <Icon size={16} className="text-[var(--neutral-500)] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="text-xs bg-[var(--neutral-200)] text-[var(--neutral-500)] px-1.5 py-0.5 rounded font-mono">
                        {item.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Group 2: Acciones rápidas */}
            <Command.Group heading="Acciones rápidas" className={groupHeadingClass}>
              {QUICK_ACTIONS.map((item) => (
                <Command.Item
                  key={item.label}
                  value={item.label}
                  onSelect={item.action}
                  className={itemClass}
                >
                  <Zap size={16} className="text-[var(--neutral-500)] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-xs bg-[var(--neutral-200)] text-[var(--neutral-500)] px-1.5 py-0.5 rounded font-mono">
                      {item.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Group 3: Apariencia */}
            <Command.Group heading="Apariencia" className={groupHeadingClass}>
              {APPEARANCE_ITEMS.map((item) => (
                <Command.Item
                  key={item.label}
                  value={item.label}
                  onSelect={item.action}
                  className={itemClass}
                >
                  <Palette size={16} className="text-[var(--neutral-500)] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Group 4: Ayuda */}
            <Command.Group heading="Ayuda" className={groupHeadingClass}>
              {HELP_ITEMS.map((item) => (
                <Command.Item
                  key={item.label}
                  value={item.label}
                  onSelect={item.action}
                  className={itemClass}
                >
                  <HelpCircle size={16} className="text-[var(--neutral-500)] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Group 5: Sesión */}
            <Command.Group heading="Sesión" className={groupHeadingClass}>
              <Command.Item
                value="Cerrar sesión"
                onSelect={handleSignOut}
                className={itemClass}
              >
                <LogOut size={16} className="text-[var(--neutral-500)] shrink-0" />
                <span className="flex-1">Cerrar sesión</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
