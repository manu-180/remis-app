'use client';

import { Fragment, useState, useRef } from 'react';
import { Check, Upload, Loader2, User, Car, FileText, CheckCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DriverWithProfile } from './driver-profile-client';
import { DOCUMENT_LABELS } from './tabs/tab-documentos';

// ---------------------------------------------------------------------------
// Document types
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

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------
const STEPS_NEW = ['Datos personales', 'Vehículo', 'Documentos', 'Confirmación'];
const STEPS_EDIT = ['Datos personales', 'Vehículo'];

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <Fragment key={i}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-200',
                i < current &&
                  'bg-[var(--brand-accent)] border-[var(--brand-accent)] text-white',
                i === current &&
                  'border-[var(--brand-accent)] text-[var(--brand-accent)]',
                i > current &&
                  'border-[var(--neutral-300)] text-[var(--neutral-400)]',
              )}
            >
              {i < current ? <Check size={14} /> : i + 1}
            </div>
            <span className="text-[10px] text-[var(--neutral-500)] whitespace-nowrap">{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2 mb-5',
                i < current ? 'bg-[var(--brand-accent)]' : 'bg-[var(--neutral-200)]',
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Personal data
// ---------------------------------------------------------------------------
interface Step1Data {
  full_name: string;
  phone: string;
  email: string;
}

function Step1({
  data,
  onChange,
  avatarFile,
  onAvatarChange,
  avatarPreview,
  isEdit,
}: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  avatarFile: File | null;
  onAvatarChange: (f: File | null, preview: string | null) => void;
  avatarPreview: string | null;
  isEdit: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) { onAvatarChange(null, null); return; }
    const preview = URL.createObjectURL(file);
    onAvatarChange(file, preview);
  }

  return (
    <div className="space-y-4">
      {/* Avatar (new mode only) */}
      {!isEdit && (
        <div className="flex flex-col items-center gap-3 mb-6">
          <div
            className="w-20 h-20 rounded-full bg-[var(--neutral-200)] flex items-center justify-center cursor-pointer overflow-hidden ring-2 ring-[var(--neutral-300)] hover:ring-[var(--brand-accent)] transition-all"
            onClick={() => fileRef.current?.click()}
            title="Cambiar foto"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-[var(--neutral-400)]" />
            )}
          </div>
          <button
            type="button"
            className="text-xs text-[var(--brand-primary)] hover:underline"
            onClick={() => fileRef.current?.click()}
          >
            {avatarPreview ? 'Cambiar foto' : 'Subir foto (opcional)'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      <Field label="Nombre completo" required>
        <Input
          value={data.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          placeholder="Juan Pérez"
        />
      </Field>

      <Field label="Teléfono">
        <Input
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+54 9 2954 123456"
        />
      </Field>

      <Field label="Email">
        <Input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="conductor@email.com"
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Vehicle
// ---------------------------------------------------------------------------
type VehicleMode = 'existing' | 'new' | 'none';

interface Step2Data {
  vehicleMode: VehicleMode;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  color: string;
  year: string;
  vehicleType: string;
}

function Step2({
  data,
  onChange,
}: {
  data: Step2Data;
  onChange: (d: Partial<Step2Data>) => void;
}) {
  const { data: vehicles, isLoading } = useSupabaseQuery<Array<{
    id: string;
    plate: string | null;
    make: string | null;
    model: string | null;
  }>>(
    ['vehicles-active'],
    async (sb) => {
      const result = await sb
        .from('vehicles')
        .select('id, plate, make, model')
        .eq('is_active', true)
        .order('plate');
      return { data: result.data ?? [], error: result.error };
    },
    { enabled: data.vehicleMode === 'existing' },
  );

  const vehicleOptions = (vehicles ?? []).map((v) => ({
    value: v.id,
    label: [v.plate, [v.make, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' — '),
  }));

  const vehicleTypeOptions = [
    { value: 'sedan', label: 'Sedán' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: 'Van' },
    { value: 'accessible', label: 'Accesible' },
  ];

  const modeOptions: Array<{ value: VehicleMode; label: string; icon: React.ReactNode }> = [
    { value: 'existing', label: 'Asignar existente', icon: <Car size={16} /> },
    { value: 'new', label: 'Crear nuevo', icon: <Car size={16} /> },
    { value: 'none', label: 'Sin vehículo', icon: <Car size={16} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
          Vehículo
        </label>
        <div className="flex gap-2 flex-wrap">
          {modeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ vehicleMode: opt.value })}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-sm transition-all',
                data.vehicleMode === opt.value
                  ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] font-medium'
                  : 'border-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-50)]',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Existing vehicle */}
      {data.vehicleMode === 'existing' && (
        <Field label="Seleccionar vehículo">
          <Combobox
            options={vehicleOptions}
            value={data.vehicleId}
            onValueChange={(v) => onChange({ vehicleId: v })}
            placeholder="Buscar por patente o modelo..."
            loading={isLoading}
            emptyMessage="No hay vehículos disponibles"
          />
        </Field>
      )}

      {/* New vehicle */}
      {data.vehicleMode === 'new' && (
        <div className="space-y-3 p-4 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)]">
          <Field label="Patente" required>
            <Input
              value={data.plate}
              onChange={(e) => onChange({ plate: e.target.value.toUpperCase() })}
              placeholder="ABC123"
              maxLength={10}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <Input
                value={data.make}
                onChange={(e) => onChange({ make: e.target.value })}
                placeholder="Toyota"
              />
            </Field>
            <Field label="Modelo">
              <Input
                value={data.model}
                onChange={(e) => onChange({ model: e.target.value })}
                placeholder="Corolla"
              />
            </Field>
            <Field label="Color">
              <Input
                value={data.color}
                onChange={(e) => onChange({ color: e.target.value })}
                placeholder="Blanco"
              />
            </Field>
            <Field label="Año">
              <Input
                type="number"
                value={data.year}
                onChange={(e) => onChange({ year: e.target.value })}
                placeholder={String(new Date().getFullYear())}
                min={1990}
                max={new Date().getFullYear() + 1}
              />
            </Field>
          </div>
          <Field label="Tipo de vehículo">
            <Select
              options={vehicleTypeOptions}
              value={data.vehicleType}
              onValueChange={(v) => onChange({ vehicleType: v })}
              placeholder="Seleccionar tipo"
            />
          </Field>
        </div>
      )}

      {data.vehicleMode === 'none' && (
        <p className="text-sm text-[var(--neutral-500)]">
          El conductor quedará sin vehículo asignado. Podés asignar uno luego desde el perfil.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Documents
// ---------------------------------------------------------------------------
function Step3({
  docFiles,
  onChange,
}: {
  docFiles: Partial<Record<DocumentType, File>>;
  onChange: (type: DocumentType, file: File | null) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-[var(--neutral-500)] mb-4">
        Todos los documentos son opcionales. Podés subirlos ahora o más tarde desde el perfil.
      </p>
      {DOCUMENT_TYPES.map((type) => {
        const file = docFiles[type];
        return (
          <div
            key={type}
            className="flex items-center gap-3 py-2.5 border-b border-[var(--neutral-100)] last:border-b-0"
          >
            <span className="flex-1 text-sm text-[var(--neutral-700)]">
              {DOCUMENT_LABELS[type]}
            </span>
            <input
              type="file"
              id={`doc-${type}`}
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => onChange(type, e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById(`doc-${type}`)?.click()}
            >
              {file ? (
                <>
                  <Check size={13} className="text-[var(--success)] mr-1" />
                  {file.name.slice(0, 20)}
                </>
              ) : (
                <>
                  <Upload size={13} className="mr-1" />
                  Subir
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Summary
// ---------------------------------------------------------------------------
function Step4({
  step1,
  step2,
  docFiles,
  activateImmediately,
  onActivateChange,
}: {
  step1: Step1Data;
  step2: Step2Data;
  docFiles: Partial<Record<DocumentType, File>>;
  activateImmediately: boolean;
  onActivateChange: (v: boolean) => void;
}) {
  const docsCount = Object.values(docFiles).filter(Boolean).length;
  const vehicleLabel =
    step2.vehicleMode === 'none'
      ? 'Sin vehículo'
      : step2.vehicleMode === 'existing'
        ? 'Vehículo existente'
        : step2.plate || 'Vehículo nuevo';

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] divide-y divide-[var(--neutral-100)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <User size={16} className="text-[var(--neutral-400)]" />
          <div>
            <p className="text-xs text-[var(--neutral-500)]">Conductor</p>
            <p className="text-sm font-medium text-[var(--neutral-900)]">
              {step1.full_name || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Car size={16} className="text-[var(--neutral-400)]" />
          <div>
            <p className="text-xs text-[var(--neutral-500)]">Vehículo</p>
            <p className="text-sm font-medium text-[var(--neutral-900)]">{vehicleLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <FileText size={16} className="text-[var(--neutral-400)]" />
          <div>
            <p className="text-xs text-[var(--neutral-500)]">Documentos</p>
            <p className="text-sm font-medium text-[var(--neutral-900)]">
              {docsCount} de {DOCUMENT_TYPES.length} cargados
            </p>
          </div>
        </div>
      </div>

      {/* Activate toggle */}
      <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] border border-[var(--neutral-200)]">
        <div>
          <Label className="text-sm font-medium text-[var(--neutral-900)]">
            Activar inmediatamente
          </Label>
          <p className="text-xs text-[var(--neutral-500)] mt-0.5">
            El conductor quedará habilitado para recibir viajes.
          </p>
        </div>
        <Switch checked={activateImmediately} onCheckedChange={onActivateChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------
export interface DriverFormDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: DriverWithProfile;
  onSuccess?: (driverId: string) => void;
}

export function DriverFormDrawer({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: DriverFormDrawerProps) {
  const isEdit = !!initialData;
  const steps = isEdit ? STEPS_EDIT : STEPS_NEW;

  const [step, setStep] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Step 1 data
  const [step1, setStep1] = useState<Step1Data>({
    full_name: initialData?.profiles.full_name ?? '',
    phone: initialData?.profiles.phone ?? '',
    email: initialData?.profiles.email ?? '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Step 2 data
  const [step2, setStep2] = useState<Step2Data>({
    vehicleMode: initialData?.vehicle_id ? 'existing' : 'none',
    vehicleId: initialData?.vehicle_id ?? '',
    plate: '',
    make: '',
    model: '',
    color: '',
    year: '',
    vehicleType: 'sedan',
  });

  // Step 3 doc files
  const [docFiles, setDocFiles] = useState<Partial<Record<DocumentType, File>>>({});

  // Step 4
  const [activateImmediately, setActivateImmediately] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseBrowserClient() as any;

  function resetForm() {
    setStep(0);
    setStep1({ full_name: '', phone: '', email: '' });
    setAvatarFile(null);
    setAvatarPreview(null);
    setStep2({ vehicleMode: 'none', vehicleId: '', plate: '', make: '', model: '', color: '', year: '', vehicleType: 'sedan' });
    setDocFiles({});
    setActivateImmediately(true);
  }

  function handleClose(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

  // ------------------------------------------------------------------
  // Submit — NEW mode
  // ------------------------------------------------------------------
  async function handleCreateSubmit() {
    if (!step1.full_name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSubmitLoading(true);
    try {
      const session = await sb.auth.getSession();
      const token = session.data.session?.access_token;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const resp = await fetch(`${supabaseUrl}/functions/v1/admin-create-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: step1.full_name,
          phone: step1.phone || null,
          email: step1.email || null,
          vehicle_id: step2.vehicleMode === 'existing' ? step2.vehicleId || null : null,
          new_vehicle:
            step2.vehicleMode === 'new' && step2.plate
              ? {
                  plate: step2.plate,
                  make: step2.make || null,
                  model: step2.model || null,
                  color: step2.color || null,
                  year: step2.year ? Number(step2.year) : null,
                  vehicle_type: step2.vehicleType,
                }
              : null,
          activate_immediately: activateImmediately,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error((errBody as { error?: string }).error ?? resp.statusText);
      }
      const { driver_id } = (await resp.json()) as { driver_id: string };

      // Upload avatar
      if (avatarFile) {
        const { data: uploadData } = await sb.storage
          .from('avatars')
          .upload(`${driver_id}/avatar`, avatarFile, { upsert: true });
        if (uploadData) {
          const { data: { publicUrl } } = sb.storage
            .from('avatars')
            .getPublicUrl(uploadData.path);
          await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', driver_id);
        }
      }

      // Upload initial documents
      for (const [type, file] of Object.entries(docFiles)) {
        if (!file) continue;
        const path = `${driver_id}/${type}`;
        await sb.storage.from('driver-documents').upload(path, file, { upsert: true });
        await sb.from('driver_documents').upsert(
          {
            driver_id,
            document_type: type,
            file_url: path,
            verified: false,
          },
          { onConflict: 'driver_id,document_type' },
        );
      }

      toast.success('Conductor creado correctamente');
      handleClose(false);
      onSuccess?.(driver_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSubmitLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Submit — EDIT mode
  // ------------------------------------------------------------------
  async function handleEditSubmit() {
    if (!initialData) return;
    setSubmitLoading(true);
    try {
      // Check if email changed — just info toast
      if (step1.email && step1.email !== initialData.profiles.email) {
        toast.info('Para cambiar el email de login, usar el panel de Supabase.');
      }

      const [profileErr, driverErr] = await Promise.all([
        sb
          .from('profiles')
          .update({
            full_name: step1.full_name || null,
            phone: step1.phone || null,
          })
          .eq('id', initialData.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((r: any) => r.error),
        sb
          .from('drivers')
          .update({
            vehicle_id:
              step2.vehicleMode === 'existing' ? step2.vehicleId || null : null,
          })
          .eq('id', initialData.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((r: any) => r.error),
      ]);

      if (profileErr) throw new Error(profileErr.message);
      if (driverErr) throw new Error(driverErr.message);

      toast.success('Cambios guardados');
      handleClose(false);
      onSuccess?.(initialData.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSubmitLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function handleNext() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Last step submit
      if (isEdit) {
        handleEditSubmit();
      } else {
        handleCreateSubmit();
      }
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  const isLastStep = step === steps.length - 1;

  // Footer
  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={step === 0 ? () => handleClose(false) : handleBack}
        disabled={submitLoading}
      >
        {step === 0 ? 'Cancelar' : 'Atrás'}
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleNext}
        disabled={submitLoading}
        className="min-w-[120px]"
      >
        {submitLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Guardando...
          </>
        ) : isLastStep ? (
          isEdit ? (
            'Guardar cambios'
          ) : (
            <>
              <CheckCircle size={14} />
              Crear conductor
            </>
          )
        ) : (
          'Siguiente'
        )}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onOpenChange={handleClose}
      title={isEdit ? `Editar conductor` : 'Nuevo conductor'}
      width="lg"
      footer={footer}
    >
      <Stepper steps={steps} current={step} />

      {/* Step content */}
      {step === 0 && (
        <Step1
          data={step1}
          onChange={(d) => setStep1((prev) => ({ ...prev, ...d }))}
          avatarFile={avatarFile}
          onAvatarChange={(file, preview) => {
            setAvatarFile(file);
            setAvatarPreview(preview);
          }}
          avatarPreview={avatarPreview}
          isEdit={isEdit}
        />
      )}

      {step === 1 && (
        <Step2
          data={step2}
          onChange={(d) => setStep2((prev) => ({ ...prev, ...d }))}
        />
      )}

      {step === 2 && !isEdit && (
        <Step3
          docFiles={docFiles}
          onChange={(type, file) =>
            setDocFiles((prev) => {
              const next = { ...prev };
              if (file) {
                next[type] = file;
              } else {
                delete next[type];
              }
              return next;
            })
          }
        />
      )}

      {step === 3 && !isEdit && (
        <Step4
          step1={step1}
          step2={step2}
          docFiles={docFiles}
          activateImmediately={activateImmediately}
          onActivateChange={setActivateImmediately}
        />
      )}
    </Drawer>
  );
}
