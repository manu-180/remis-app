import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('border-b border-[var(--neutral-200)] pb-6 last:border-b-0', className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--neutral-900)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--neutral-500)]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
