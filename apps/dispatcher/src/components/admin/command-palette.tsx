'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard, Radio, AlertTriangle, MapPin, Car, Users,
  CreditCard, Map, DollarSign, ShieldCheck, Flag, BookOpen,
  UserCog, Settings, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/',                    label: 'Despacho live',  icon: Radio },
  { href: '/admin/sos',           label: 'SOS',            icon: AlertTriangle },
  { href: '/admin/rides',         label: 'Viajes',         icon: MapPin },
  { href: '/admin/drivers',       label: 'Conductores',    icon: Car },
  { href: '/admin/passengers',    label: 'Pasajeros',      icon: Users },
  { href: '/admin/payments',      label: 'Pagos',          icon: CreditCard },
  { href: '/admin/zones',         label: 'Zonas',          icon: Map },
  { href: '/admin/fares',         label: 'Tarifas',        icon: DollarSign },
  { href: '/admin/kyc',           label: 'KYC',            icon: ShieldCheck },
  { href: '/admin/feature-flags', label: 'Feature Flags',  icon: Flag },
  { href: '/admin/audit',         label: 'Audit Log',      icon: BookOpen },
  { href: '/admin/team',          label: 'Equipo',         icon: UserCog },
  { href: '/admin/settings',      label: 'Settings',       icon: Settings },
] as const;

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

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

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[18vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div className="glass relative z-10 w-full max-w-lg rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden animate-[fade-up_180ms_var(--ease-emphasized)]">
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
          <Command.List className="max-h-[360px] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--neutral-500)]">
              Sin resultados
            </Command.Empty>
            <Command.Group
              heading="Ir a"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--neutral-500)] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            >
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
                    className="flex cursor-pointer items-center gap-3 mx-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-[var(--neutral-900)] hover:bg-[var(--neutral-100)] data-[selected=true]:bg-[var(--neutral-100)] transition-colors duration-100"
                  >
                    <Icon size={16} className="text-[var(--neutral-500)] shrink-0" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
