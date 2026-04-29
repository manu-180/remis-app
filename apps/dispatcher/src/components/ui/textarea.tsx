import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'focus-ring w-full min-h-[80px] rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-0)]',
        'px-3 py-2 text-[var(--text-sm)] text-[var(--neutral-900)] placeholder:text-[var(--neutral-400)]',
        'transition-colors duration-150 hover:border-[var(--neutral-400)] resize-y',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
