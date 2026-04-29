import { AlertCircle } from 'lucide-react';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, description, error, required, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} {...(required ? { required } : {})}>{label}</Label>
      )}
      {children}
      {description && !error && (
        <p className="text-[var(--text-xs)] text-[var(--neutral-500)]">{description}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--danger)]">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
