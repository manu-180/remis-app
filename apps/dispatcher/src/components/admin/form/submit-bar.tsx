'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmitBarProps {
  onCancel?: () => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SubmitBar({
  onCancel,
  submitLabel = 'Guardar',
  loading = false,
  disabled = false,
  className,
}: SubmitBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10',
        'bg-[var(--neutral-0)] border-t border-[var(--neutral-200)]',
        'px-6 py-4 flex items-center justify-end gap-3',
        className,
      )}
    >
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={disabled || loading}
        className="min-w-[100px]"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Guardando...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
