'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const widths = { sm: '380px', md: '480px', lg: '640px', xl: '800px' } as const;

interface DrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: keyof typeof widths;
}

export function Drawer({ open, onOpenChange, title, children, footer, width = 'md' }: DrawerProps) {
  return (
    <Dialog.Root {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 z-50 h-full flex flex-col bg-[var(--neutral-0)] shadow-[var(--shadow-xl)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
            'duration-300'
          )}
          style={{ width: widths[width] }}
        >
          {title && (
            <div className="glass flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] sticky top-0 z-10">
              <Dialog.Title className="text-[var(--text-md)] font-semibold text-[var(--neutral-900)]">
                {title}
              </Dialog.Title>
              <Dialog.Close className="focus-ring rounded-[var(--radius-md)] p-1 hover:bg-[var(--neutral-100)] transition-colors duration-150">
                <X size={18} className="text-[var(--neutral-500)]" />
                <span className="sr-only">Cerrar</span>
              </Dialog.Close>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer && (
            <div className="sticky bottom-0 border-t border-[var(--neutral-200)] bg-[var(--neutral-0)] px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const DrawerTrigger = Dialog.Trigger;
export const DrawerClose = Dialog.Close;
