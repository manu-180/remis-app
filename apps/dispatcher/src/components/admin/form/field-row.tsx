import { cn } from '@/lib/utils';

interface FieldRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

export function FieldRow({ label, description, children, required, error }: FieldRowProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[200px_1fr] md:gap-6 md:items-start">
      <div className="md:pt-2.5">
        <span className="text-sm font-medium text-[var(--neutral-800)]">
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--danger)]" aria-hidden>
              *
            </span>
          )}
        </span>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--neutral-500)]">{description}</p>
        )}
      </div>
      <div
        className={cn(
          'flex flex-col gap-1.5',
          error && '[&_input]:border-[var(--danger)] [&_textarea]:border-[var(--danger)]',
        )}
      >
        {children}
        {error && (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
