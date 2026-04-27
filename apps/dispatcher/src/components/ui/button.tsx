import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary:     'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]',
        accent:      'bg-[var(--brand-accent)] text-black hover:bg-[var(--brand-accent-hover)]',
        secondary:   'bg-[var(--neutral-100)] border border-[var(--neutral-300)] text-[var(--neutral-800)] hover:bg-[var(--neutral-50)]',
        ghost:       'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]',
        destructive: 'bg-[var(--danger)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[var(--text-sm)]',
        md: 'h-10 px-4 text-[var(--text-sm)]',
        lg: 'h-12 px-5 text-[var(--text-base)]',
        xl: 'h-14 px-6 text-[var(--text-base)]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
