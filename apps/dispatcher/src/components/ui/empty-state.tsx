import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--neutral-100)] text-[var(--neutral-400)] mb-4">
        {icon}
      </div>
      <h3 className="text-[var(--text-lg)] font-semibold text-[var(--neutral-900)] mb-2">{title}</h3>
      {description && (
        <p className="text-[var(--text-sm)] text-[var(--neutral-500)] max-w-[480px]">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button variant="primary" onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  );
}
