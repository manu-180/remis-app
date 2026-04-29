import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-[var(--text-sm)] font-medium text-[var(--neutral-700)]', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
    </label>
  )
);
Label.displayName = 'Label';
