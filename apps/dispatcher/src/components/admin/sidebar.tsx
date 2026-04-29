'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radio, AlertTriangle, MapPin, Car, Users,
  CreditCard, Map, DollarSign, ShieldCheck, Flag, BookOpen,
  UserCog, Settings, PanelLeft, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSosCount } from '@/hooks/use-sos-count';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Types ─────────────────────────────────────────────────── */
interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: 'sos';
  exact?: boolean;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

/* ── Nav sections ──────────────────────────────────────────── */
const SECTIONS: { title: string; items: NavItemDef[] }[] = [
  {
    title: 'Operación',
    items: [
      { href: '/admin',     label: 'Dashboard',     icon: LayoutDashboard, exact: true },
      { href: '/',          label: 'Despacho live',  icon: Radio,           exact: true },
      { href: '/admin/sos', label: 'SOS',            icon: AlertTriangle,   badge: 'sos' },
    ],
  },
  {
    title: 'Datos',
    items: [
      { href: '/admin/rides',      label: 'Viajes',      icon: MapPin },
      { href: '/admin/drivers',    label: 'Conductores', icon: Car },
      { href: '/admin/passengers', label: 'Pasajeros',   icon: Users },
      { href: '/admin/payments',   label: 'Pagos',       icon: CreditCard },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { href: '/admin/zones',         label: 'Zonas',         icon: Map },
      { href: '/admin/fares',         label: 'Tarifas',       icon: DollarSign },
      { href: '/admin/kyc',           label: 'KYC',           icon: ShieldCheck },
      { href: '/admin/feature-flags', label: 'Feature Flags', icon: Flag },
      { href: '/admin/team',          label: 'Equipo',        icon: UserCog },
      { href: '/admin/settings',      label: 'Settings',      icon: Settings },
    ],
  },
  {
    title: 'Auditoría',
    items: [
      { href: '/admin/audit', label: 'Audit Log', icon: BookOpen },
    ],
  },
];

/* ── NavItem ───────────────────────────────────────────────── */
interface NavItemProps {
  def: NavItemDef;
  collapsed: boolean;
  sosCount: number;
  onClose?: () => void;
}

// exactOptionalPropertyTypes helper
function optClick(fn: (() => void) | undefined): { onClick: () => void } | Record<string, never> {
  return fn ? { onClick: fn } : {};
}

function NavItem({ def, collapsed, sosCount, onClose }: NavItemProps) {
  const pathname = usePathname();
  const active = def.exact ? pathname === def.href : pathname.startsWith(def.href);
  const badge = def.badge === 'sos' ? sosCount : undefined;

  const inner = (
    <Link
      href={def.href}
      {...optClick(onClose)}
      className={cn(
        'group relative flex items-center gap-3 rounded-[var(--radius-md)] text-sm font-medium',
        'transition-all duration-150 ease-out focus-ring',
        collapsed
          ? 'h-10 w-10 justify-center mx-auto'
          : 'px-3 py-2.5',
        active
          ? 'bg-[var(--brand-primary)] text-white border-l-[3px] border-l-[var(--brand-accent)]'
          : 'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-900)]'
      )}
    >
      <def.icon
        size={18}
        className={cn(
          'shrink-0',
          active ? 'text-white' : 'text-[var(--neutral-500)] group-hover:text-[var(--neutral-700)]'
        )}
      />

      {/* Label — se oculta con fade al colapsar */}
      <span
        className={cn(
          'truncate transition-all duration-150',
          collapsed ? 'w-0 opacity-0 overflow-hidden' : 'flex-1'
        )}
      >
        {def.label}
      </span>

      {/* Badge */}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
          'animate-[pulse-soft_2s_ease-in-out_infinite]',
          active ? 'bg-white text-[var(--brand-primary)]' : 'bg-[var(--danger)] text-white'
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {/* Dot dorado cuando está activo y expandido */}
      {active && !collapsed && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-accent)]" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-[var(--neutral-900)] text-white text-xs px-2 py-1"
        >
          {def.label}
          {badge !== undefined && badge > 0 && (
            <span className="ml-1.5 rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-xs font-bold">
              {badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

/* ── SidebarContent ────────────────────────────────────────── */
function SidebarContent({
  collapsed,
  onToggle,
  mobile,
  onClose,
}: SidebarProps & { onClose?: () => void }) {
  const sosCount = useSosCount();

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex h-full flex-col bg-[var(--neutral-0)] border-r border-[var(--neutral-200)]',
          'transition-[width] duration-200 ease-[var(--ease-emphasized)]',
          mobile ? 'w-full' : collapsed ? 'w-[72px]' : 'w-[264px]'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-[var(--neutral-200)] shrink-0',
            collapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-5'
          )}
        >
          <Link
            href="/admin"
            className="focus-ring rounded-[var(--radius-md)] flex items-center gap-3"
            {...optClick(onClose)}
          >
            {/* Logo SVG */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1L16 5V9C16 13 13 16.5 9 17C5 16.5 2 13 2 9V5L9 1Z" fill="var(--brand-accent)" fillOpacity=".9" />
                <path d="M9 4.5L13 7V9.5C13 11.8 11.3 13.8 9 14.2C6.7 13.8 5 11.8 5 9.5V7L9 4.5Z" fill="white" fillOpacity=".8" />
              </svg>
            </span>

            <span
              className={cn(
                'font-bold tracking-tight text-[var(--neutral-900)] transition-all duration-150',
                (collapsed && !mobile) ? 'w-0 opacity-0 overflow-hidden' : 'text-[15px]'
              )}
            >
              RemisDespacho
            </span>
          </Link>

          {/* Close button on mobile */}
          {mobile && onClose && (
            <button
              onClick={onClose}
              className="ml-auto focus-ring rounded-[var(--radius-md)] p-1 text-[var(--neutral-400)] hover:text-[var(--neutral-700)]"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              {/* Section title */}
              {!collapsed && !mobile ? (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-400)]">
                  {section.title}
                </p>
              ) : (
                !mobile && <div className="mb-1 mx-3 h-px bg-[var(--neutral-200)]" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavItem
                      def={item}
                      collapsed={collapsed && !mobile}
                      sosCount={sosCount}
                      {...(onClose ? { onClose } : {})}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer — collapse button */}
        {!mobile && (
          <div className="border-t border-[var(--neutral-200)] p-2">
            <button
              onClick={onToggle}
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              className={cn(
                'focus-ring flex h-10 w-full items-center rounded-[var(--radius-md)] text-[var(--neutral-500)]',
                'hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-700)] transition-colors duration-150',
                collapsed ? 'justify-center' : 'gap-3 px-3'
              )}
            >
              <PanelLeft
                size={18}
                className={cn(
                  'shrink-0 transition-transform duration-200',
                  collapsed && 'rotate-180'
                )}
              />
              <span
                className={cn(
                  'text-sm transition-all duration-150',
                  collapsed ? 'w-0 opacity-0 overflow-hidden' : 'flex-1 text-left'
                )}
              >
                Colapsar
              </span>
            </button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/* ── Sidebar (exported) ────────────────────────────────────── */
export function Sidebar(props: SidebarProps) {
  return <SidebarContent {...props} />;
}

export function MobileSidebar({
  onClose,
  ...props
}: SidebarProps & { onClose: () => void }) {
  return <SidebarContent {...props} onClose={onClose} />;
}
