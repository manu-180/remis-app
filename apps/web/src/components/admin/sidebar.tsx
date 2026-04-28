'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  Users,
  DollarSign,
  BarChart2,
  Activity,
  ShieldCheck,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/flota', label: 'Flota', icon: Truck },
  { href: '/admin/conductores', label: 'Conductores', icon: Users },
  { href: '/admin/tarifas', label: 'Tarifas', icon: DollarSign },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart2 },
  { href: '/admin/heartbeat-monitor', label: 'Heartbeat', icon: Activity },
  { href: '/admin/slo', label: 'SLOs', icon: ShieldCheck },
  { href: '/admin/audit', label: 'Auditoría', icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[var(--neutral-100)] border-r border-[var(--neutral-200)] min-h-screen">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-[var(--neutral-200)]">
        <span className="font-[family-name:var(--font-inter-tight)] font-bold text-lg text-[var(--neutral-900)]">
          Remis <span className="text-[var(--brand-accent)]">Admin</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
              isActive(href, exact)
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--neutral-600)] hover:bg-[var(--neutral-200)] hover:text-[var(--neutral-900)]',
            )}
          >
            <Icon size={17} strokeWidth={isActive(href, exact) ? 2 : 1.75} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[var(--neutral-200)] space-y-0.5">
        <Link
          href="/admin/configuracion"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-200)] hover:text-[var(--neutral-900)] transition-colors"
        >
          <Settings size={17} strokeWidth={1.75} />
          Configuración
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-200)] hover:text-[var(--neutral-900)] transition-colors"
          >
            <LogOut size={17} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
