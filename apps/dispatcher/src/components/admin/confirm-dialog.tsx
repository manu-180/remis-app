'use client';

import * as React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ConfirmContext = React.createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return React.useContext(ConfirmContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
      setIsLoading(false);
    });
  }, []);

  const handleConfirm = () => {
    pending?.resolve(true);
    setPending(null);
  };

  const handleCancel = () => {
    pending?.resolve(false);
    setPending(null);
  };

  const opts = pending?.opts;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent
          className="sm:max-w-md bg-[var(--neutral-0)] border-[var(--neutral-200)]"
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              {opts?.danger && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--danger-bg)]">
                  <AlertTriangle size={20} className="text-[var(--danger)]" />
                </div>
              )}
              <div className="flex-1">
                <DialogTitle className="text-[var(--neutral-900)]">
                  {opts?.title ?? ''}
                </DialogTitle>
                {opts?.description && (
                  <DialogDescription className="mt-1.5 text-[var(--neutral-600)]">
                    {opts.description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading || opts?.loading}
            >
              {opts?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              type="button"
              variant={opts?.danger ? 'destructive' : 'primary'}
              onClick={handleConfirm}
              disabled={isLoading || opts?.loading}
              className="min-w-[80px]"
            >
              {(isLoading || opts?.loading) ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                opts?.confirmLabel ?? 'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
