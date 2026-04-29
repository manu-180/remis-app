import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageBackProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function PageBack({ href, children, className }: PageBackProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-1.5 text-sm',
        'text-[var(--neutral-500)] hover:text-[var(--neutral-900)]',
        'transition-colors duration-150',
        className,
      )}
    >
      <ArrowLeft
        size={15}
        className="transition-transform duration-150 group-hover:-translate-x-1"
      />
      {children}
    </Link>
  );
}
