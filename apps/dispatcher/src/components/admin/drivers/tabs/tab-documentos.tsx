'use client';

import { useState } from 'react';
import { Upload, Check, FileText, ShieldCheck, ShieldX } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DOCUMENT_TYPES = [
  'luc_d1',
  'vtv',
  'insurance_rc',
  'insurance_passengers',
  'health_card',
  'vehicle_authorization',
  'criminal_record',
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  luc_d1: 'LUC D1',
  vtv: 'VTV',
  insurance_rc: 'Seguro RC',
  insurance_passengers: 'Seguro pasajeros',
  health_card: 'Carnet sanitario',
  vehicle_authorization: 'Autorización vehicular',
  criminal_record: 'Antecedentes',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DriverDocument = {
  id: string;
  driver_id: string;
  document_type: string;
  file_url: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verified: boolean | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDocStatus(doc: DriverDocument | undefined): {
  label: string;
  className: string;
  expiring: boolean;
  expired: boolean;
} {
  if (!doc || !doc.file_url) {
    return {
      label: 'Sin subir',
      className: 'bg-[var(--neutral-100)] text-[var(--neutral-500)]',
      expiring: false,
      expired: false,
    };
  }

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (doc.expires_at) {
    const expires = new Date(doc.expires_at);
    if (expires < now) {
      return {
        label: 'Vencido',
        className: 'bg-[var(--danger)]/10 text-[var(--danger)]',
        expiring: false,
        expired: true,
      };
    }
    if (expires < thirtyDays) {
      return {
        label: 'Por vencer',
        className: 'bg-[var(--warning)]/10 text-[var(--warning)]',
        expiring: true,
        expired: false,
      };
    }
  }

  if (doc.verified) {
    return {
      label: 'Verificado',
      className: 'bg-[var(--success)]/10 text-[var(--success)]',
      expiring: false,
      expired: false,
    };
  }

  return {
    label: 'Pendiente',
    className: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    expiring: false,
    expired: false,
  };
}

// ---------------------------------------------------------------------------
// Upload drawer
// ---------------------------------------------------------------------------
interface UploadDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId: string;
  documentType: DocumentType;
  existingDoc?: DriverDocument | undefined;
  onSuccess: () => void;
}

function UploadDrawer({ open, onOpenChange, driverId, documentType, existingDoc, onSuccess }: UploadDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [issuedAt, setIssuedAt] = useState(existingDoc?.issued_at?.slice(0, 10) ?? '');
  const [expiresAt, setExpiresAt] = useState(existingDoc?.expires_at?.slice(0, 10) ?? '');
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseBrowserClient() as any;

  async function handleSave() {
    if (!file) {
      toast.error('Seleccioná un archivo');
      return;
    }
    setUploading(true);
    try {
      const path = `${driverId}/${documentType}`;
      const { error: uploadErr } = await sb.storage
        .from('driver-documents')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw new Error(String(uploadErr.message));

      const { data: signedData, error: signErr } = await sb.storage
        .from('driver-documents')
        .createSignedUrl(path, 3600);
      if (signErr) throw new Error(String(signErr.message));

      const { error: upsertErr } = await sb.from('driver_documents').upsert(
        {
          driver_id: driverId,
          document_type: documentType,
          file_url: signedData.signedUrl,
          issued_at: issuedAt || null,
          expires_at: expiresAt || null,
          verified: false,
        },
        { onConflict: 'driver_id,document_type' },
      );
      if (upsertErr) throw new Error(String(upsertErr.message));

      toast.success('Documento subido correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Subir documento: ${DOCUMENT_LABELS[documentType]}`}
      width="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={uploading || !file}>
            {uploading ? 'Subiendo...' : 'Guardar documento'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* File input */}
        <div>
          <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
            Archivo
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[var(--neutral-700)] file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-md)] file:border-0 file:bg-[var(--neutral-100)] file:text-sm file:font-medium hover:file:bg-[var(--neutral-200)] cursor-pointer"
          />
          {file && (
            <p className="mt-1.5 text-xs text-[var(--neutral-500)]">{file.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--neutral-700)] mb-1.5">
            Fecha de emisión
          </label>
          <input
            type="date"
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:border-[var(--brand-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--neutral-700)] mb-1.5">
            Fecha de vencimiento
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:border-[var(--brand-primary)]"
          />
        </div>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Document card
// ---------------------------------------------------------------------------
interface DocCardProps {
  docType: DocumentType;
  doc?: DriverDocument | undefined;
  driverId: string;
  onRefresh: () => void;
}

function DocCard({ docType, doc, driverId, onRefresh }: DocCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseBrowserClient() as any;

  const status = getDocStatus(doc);

  async function handleVerify() {
    if (!doc?.id) return;
    setVerifying(true);
    const { error } = await sb
      .from('driver_documents')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', doc.id);
    setVerifying(false);
    if (error) {
      toast.error(String(error.message));
      return;
    }
    toast.success('Documento verificado');
    onRefresh();
  }

  return (
    <>
      <Card
        className={cn(
          'transition-all',
          status.expired && 'border-l-4 border-l-[var(--danger)]',
          status.expiring && !status.expired && 'border-l-4 border-l-[var(--warning)]',
        )}
      >
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--neutral-400)] shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-[var(--neutral-900)]">
                {DOCUMENT_LABELS[docType]}
              </span>
            </div>
            <Badge className={cn('shrink-0 text-[10px]', status.className)}>
              {status.label}
            </Badge>
          </div>

          {doc?.issued_at && (
            <p className="text-xs text-[var(--neutral-500)]">
              Emitido: {new Date(doc.issued_at).toLocaleDateString('es-AR')}
            </p>
          )}
          {doc?.expires_at && (
            <p className={cn('text-xs', status.expired ? 'text-[var(--danger)]' : status.expiring ? 'text-[var(--warning)]' : 'text-[var(--neutral-500)]')}>
              Vence: {new Date(doc.expires_at).toLocaleDateString('es-AR')}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload size={13} className="mr-1" />
              {doc?.file_url ? 'Reemplazar' : 'Subir'}
            </Button>
            {doc?.file_url && !doc.verified && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVerify}
                disabled={verifying}
              >
                <ShieldCheck size={13} className="mr-1 text-[var(--success)]" />
                Verificar
              </Button>
            )}
            {doc?.verified && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--success)] font-medium px-2">
                <Check size={12} />
                Verificado
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadOpen && (
        <UploadDrawer
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          driverId={driverId}
          documentType={docType}
          existingDoc={doc}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface DriverTabDocumentosProps {
  driverId: string;
}

export function DriverTabDocumentos({ driverId }: DriverTabDocumentosProps) {
  const { data: docs, isLoading, refetch } = useSupabaseQuery<DriverDocument[]>(
    ['driver-documents', driverId],
    async (sb) => {
      const result = await sb
        .from('driver_documents')
        .select('id, driver_id, document_type, file_url, issued_at, expires_at, verified, verified_by, verified_at, created_at')
        .eq('driver_id', driverId);
      return { data: (result.data ?? []) as DriverDocument[], error: result.error };
    },
  );

  const docsMap = new Map((docs ?? []).map((d) => [d.document_type, d]));

  const verifiedCount = (docs ?? []).filter((d) => d.verified).length;
  const totalCount = DOCUMENT_TYPES.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        {verifiedCount === totalCount ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)]">
            <ShieldCheck size={16} />
            Documentación completa y verificada
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--neutral-500)]">
            <ShieldX size={16} />
            {verifiedCount} de {totalCount} documentos verificados
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENT_TYPES.map((t) => (
            <Skeleton key={t} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENT_TYPES.map((docType) => (
            <DocCard
              key={docType}
              docType={docType}
              doc={docsMap.get(docType)}
              driverId={driverId}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
