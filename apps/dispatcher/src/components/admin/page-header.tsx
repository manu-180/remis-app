import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, actions, className }: PageHeaderProps) {
  const rightSlot = actions ?? action;
  return (
    <header className={cn('flex items-center justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--neutral-900)]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--neutral-500)] mt-1">{description}</p>
        )}
      </div>
      {rightSlot && <div className="shrink-0 flex items-center gap-2 ml-auto">{rightSlot}</div>}
    </header>
  );
}
