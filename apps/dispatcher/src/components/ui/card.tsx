import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-[var(--radius-lg)] border transition-all duration-200',
  {
    variants: {
      variant: {
        default:  'bg-[var(--neutral-0)] border-[var(--neutral-200)] shadow-[var(--shadow-sm)]',
        elevated: 'bg-[var(--neutral-0)] border-[var(--neutral-200)] shadow-[var(--shadow-md)]',
        glass:    'glass',
        accent:   'bg-[var(--neutral-0)] border-[var(--neutral-200)] shadow-[var(--shadow-sm)] border-l-[4px] border-l-[var(--brand-accent)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[var(--text-md)] font-semibold text-[var(--neutral-900)] leading-none tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[var(--text-sm)] text-[var(--neutral-500)]', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
