'use client';

import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ExportCsvButtonProps {
  onClick: () => void;
  exporting: boolean;
  disabled?: boolean;
  emptyHint?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ExportCsvButton({
  onClick,
  exporting,
  disabled = false,
  emptyHint = false,
  label = 'Exportar CSV',
  size = 'md',
}: ExportCsvButtonProps) {
  const isDisabled = disabled || exporting || emptyHint;
  const title = emptyHint ? 'No hay filas para exportar' : label;
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      aria-label="Exportar lista a CSV"
    >
      {exporting ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Download size={14} />
      )}
      {label}
    </Button>
  );
}
