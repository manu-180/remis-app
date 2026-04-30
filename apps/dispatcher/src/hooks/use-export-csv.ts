'use client';
import { useCallback, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  buildCsv,
  downloadCsv,
  isoTimestampForFilename,
  type CsvColumn,
} from '@/lib/export-csv';

const CHUNK = 1000;
const MAX_ROWS = 10_000;

export interface UseExportCsvOptions<T> {
  filename: string;
  columns: CsvColumn<T>[];
  fetchPage: (offset: number, limit: number) => Promise<T[]>;
}

export function useExportCsv<T>(opts: UseExportCsvOptions<T>) {
  const [exporting, setExporting] = useState(false);

  const exportNow = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    const tId = toast.loading('Generando CSV…');
    try {
      const all: T[] = [];
      for (let off = 0; off < MAX_ROWS; off += CHUNK) {
        const page = await opts.fetchPage(off, CHUNK);
        all.push(...page);
        if (page.length < CHUNK) break;
      }
      const csv = buildCsv(all, opts.columns);
      const filename = `${opts.filename}-${isoTimestampForFilename()}.csv`;
      downloadCsv(filename, csv);
      toast.dismiss(tId);
      toast.success(
        `Exportadas ${all.length.toLocaleString('es-AR')} filas`,
      );
    } catch (err) {
      toast.dismiss(tId);
      toast.error('No pudimos exportar el CSV. Reintentá en unos segundos.');
      throw err;
    } finally {
      setExporting(false);
    }
  }, [exporting, opts]);

  return { exportNow, exporting };
}
