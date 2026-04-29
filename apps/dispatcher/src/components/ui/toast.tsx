'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastVariant } from './use-toast';
import { cn } from '@/lib/utils';

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-[var(--success)]" />,
  error:   <XCircle     size={16} className="text-[var(--danger)]" />,
  info:    <Info         size={16} className="text-[var(--info)]" />,
  loading: <Loader2      size={16} className="text-[var(--neutral-500)] animate-spin" />,
};

function ToastEntry({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    if (item.duration === Infinity) return;
    const t = setTimeout(() => remove(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.id, item.duration, remove]);

  return (
    <div className="glass rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-[360px] animate-[fade-up_240ms_var(--ease-emphasized)]">
      <span className="mt-0.5 shrink-0">{icons[item.variant]}</span>
      <p className="flex-1 text-[var(--text-sm)] text-[var(--neutral-900)]">{item.message}</p>
      <div className="flex items-center gap-2 shrink-0">
        {item.undoFn && (
          <button
            onClick={() => { item.undoFn?.(); remove(item.id); }}
            className="text-[var(--text-xs)] font-medium text-[var(--brand-accent)] hover:underline focus-ring rounded"
          >
            Deshacer
          </button>
        )}
        <button
          onClick={() => remove(item.id)}
          className="focus-ring rounded text-[var(--neutral-400)] hover:text-[var(--neutral-700)] transition-colors"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastEntry item={item} />
        </div>
      ))}
    </div>
  );
}
