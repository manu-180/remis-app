'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, ScrollText } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
};

type AuditEntry = {
  entity: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_role: string;
  diff: Record<string, unknown> | null;
  created_at: string;
};

type EnabledFilter = 'all' | 'enabled' | 'disabled';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

const KEY_REGEX = /^[a-z0-9_]+$/;

// ---------------------------------------------------------------------------
// History Drawer
// ---------------------------------------------------------------------------
interface HistoryDrawerProps {
  flagKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function HistoryDrawer({ flagKey, open, onOpenChange }: HistoryDrawerProps) {
  const [history, setHistory] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = getSupabaseBrowserClient();
    (supabase as any)
      .from('audit_log')
      .select('*')
      .eq('entity', 'feature_flags')
      .eq('entity_id', flagKey)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }: { data: AuditEntry[] | null }) => {
        setHistory(data ?? []);
      });
  }, [open, flagKey]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={`Historial de ${flagKey}`} width="md">
      {history === null ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="relative pl-6 space-y-4">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-[var(--neutral-200)]" />
          {history.map((entry) => (
            <div key={entry.created_at} className="relative">
              <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-[var(--brand)]" />
              <p className="text-xs text-[var(--neutral-500)]">{relativeTime(entry.created_at)}</p>
              <p className="text-sm text-[var(--neutral-700)]">
                {entry.action} por {entry.actor_role}
              </p>
              {entry.diff && (
                <pre className="text-xs bg-[var(--neutral-50)] rounded p-2 mt-1 overflow-auto">
                  {JSON.stringify(entry.diff, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-sm text-[var(--neutral-500)]">Sin historial registrado.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Flag Card
// ---------------------------------------------------------------------------
interface FlagCardProps {
  flag: FeatureFlag;
  onToggle: (key: string, newEnabled: boolean) => void;
  onDescriptionSave: (key: string, description: string) => void;
}

function FlagCard({ flag, onToggle, onDescriptionSave }: FlagCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftDesc, setDraftDesc] = useState(flag.description ?? '');
  const [historyOpen, setHistoryOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraftDesc(flag.description ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    setEditing(false);
    if (draftDesc !== flag.description) {
      onDescriptionSave(flag.key, draftDesc);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setDraftDesc(flag.description ?? '');
      setEditing(false);
    }
  }

  const borderClass = flag.enabled
    ? 'border-l-4 border-l-[var(--brand)]'
    : 'border-l-4 border-l-[var(--neutral-200)]';

  return (
    <>
      <Card className={borderClass}>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: flag.enabled ? 'var(--brand)' : 'var(--neutral-400)' }}
              />
              <span className="font-mono text-sm font-semibold text-[var(--neutral-900)] truncate">
                {flag.key}
              </span>
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={(val) => onToggle(flag.key, val)}
              aria-label={`Activar o desactivar ${flag.key}`}
            />
          </div>

          {editing ? (
            <input
              ref={inputRef}
              className="w-full text-sm text-[var(--neutral-700)] bg-[var(--neutral-50)] border border-[var(--neutral-300)] rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              placeholder="Agregar descripción..."
              aria-label={`Descripción de ${flag.key}`}
            />
          ) : (
            <p
              className="text-sm text-[var(--neutral-500)] cursor-text select-none"
              onDoubleClick={startEdit}
              title="Doble clic para editar"
            >
              {flag.description || '—'}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[var(--neutral-400)]">
              Actualizado: {relativeTime(flag.updated_at)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-700)]"
              aria-label={`Ver historial de ${flag.key}`}
            >
              <ScrollText size={13} />
              Historial
            </Button>
          </div>
        </CardContent>
      </Card>

      <HistoryDrawer flagKey={flag.key} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Skeleton cards
// ---------------------------------------------------------------------------
function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-[var(--neutral-200)]">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Flag Dialog
// ---------------------------------------------------------------------------
interface CreateFlagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKeys: Set<string>;
  onCreated: (flag: FeatureFlag) => void;
}

function CreateFlagDialog({
  open,
  onOpenChange,
  existingKeys,
  onCreated,
}: CreateFlagDialogProps) {
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setKey('');
      setDescription('');
      setEnabled(false);
      setKeyError(null);
      setSubmitting(false);
    }
  }, [open]);

  function validateKey(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'El nombre es requerido.';
    if (!KEY_REGEX.test(trimmed)) {
      return 'Usá solo minúsculas, números y guion bajo (snake_case).';
    }
    if (existingKeys.has(trimmed)) {
      return 'Ya existe un flag con este nombre.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateKey(key);
    if (err) {
      setKeyError(err);
      return;
    }
    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const trimmedDesc = description.trim();
    const insertResult = await (supabase as any)
      .from('feature_flags')
      .insert({
        key: key.trim(),
        enabled,
        description: trimmedDesc.length > 0 ? trimmedDesc : null,
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (insertResult.error) {
      toast.error(`No pudimos crear el flag: ${insertResult.error.message}`);
      return;
    }

    toast.success(`Flag "${key.trim()}" creado.`);
    onCreated(insertResult.data as FeatureFlag);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--neutral-0)] border-[var(--neutral-200)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--neutral-900)]">Crear nuevo flag</DialogTitle>
          <DialogDescription className="text-[var(--neutral-600)]">
            Definí un nombre interno (snake_case) y una descripción corta. Empieza desactivado por defecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flag-key">Nombre interno</Label>
            <Input
              id="flag-key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                if (keyError) setKeyError(validateKey(e.target.value));
              }}
              placeholder="ej. nueva_landing_drivers"
              autoFocus
              className="font-mono"
              aria-invalid={!!keyError}
              aria-describedby={keyError ? 'flag-key-error' : undefined}
            />
            {keyError && (
              <p id="flag-key-error" className="text-xs text-[var(--danger)]">
                {keyError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flag-description">Descripción</Label>
            <Textarea
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para qué sirve este flag..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flag-initial">Estado inicial</Label>
            <Select
              id="flag-initial"
              value={enabled ? 'enabled' : 'disabled'}
              onValueChange={(v) => setEnabled(v === 'enabled')}
              options={[
                { value: 'disabled', label: 'Desactivado' },
                { value: 'enabled', label: 'Activado' },
              ]}
            />
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="min-w-[100px]">
              {submitting ? 'Creando...' : 'Crear flag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------
export function FeatureFlagsClient() {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [search, setSearch] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    (supabase as any)
      .from('feature_flags')
      .select('*')
      .order('key')
      .then(({ data }: { data: FeatureFlag[] | null }) => {
        setFlags(data ?? []);
      });
  }, []);

  const existingKeys = useMemo(
    () => new Set((flags ?? []).map((f) => f.key)),
    [flags],
  );

  const filteredFlags = useMemo(() => {
    if (!flags) return null;
    const q = search.trim().toLowerCase();
    return flags.filter((f) => {
      if (enabledFilter === 'enabled' && !f.enabled) return false;
      if (enabledFilter === 'disabled' && f.enabled) return false;
      if (q) {
        const inKey = f.key.toLowerCase().includes(q);
        const inDesc = (f.description ?? '').toLowerCase().includes(q);
        if (!inKey && !inDesc) return false;
      }
      return true;
    });
  }, [flags, search, enabledFilter]);

  async function handleToggle(key: string, newEnabled: boolean) {
    setFlags((prev) =>
      prev
        ? prev.map((f) =>
            f.key === key ? { ...f, enabled: newEnabled, updated_at: new Date().toISOString() } : f,
          )
        : prev,
    );

    const supabase = getSupabaseBrowserClient();
    const { error } = await (supabase as any)
      .from('feature_flags')
      .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      setFlags((prev) =>
        prev
          ? prev.map((f) => (f.key === key ? { ...f, enabled: !newEnabled } : f))
          : prev,
      );
      toast.error('No pudimos actualizar el flag. Reintentá en unos segundos.');
    }
  }

  async function handleDescriptionSave(key: string, description: string) {
    setFlags((prev) =>
      prev ? prev.map((f) => (f.key === key ? { ...f, description } : f)) : prev,
    );

    const supabase = getSupabaseBrowserClient();
    await (supabase as any)
      .from('feature_flags')
      .update({ description })
      .eq('key', key);
  }

  function handleCreated(flag: FeatureFlag) {
    setFlags((prev) =>
      prev ? [...prev, flag].sort((a, b) => a.key.localeCompare(b.key)) : [flag],
    );
  }

  // ---------------------------------------------------------------------------
  // Toolbar (search + filter + create) — siempre visible aunque la lista esté vacía
  // ---------------------------------------------------------------------------
  const toolbar = (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] pointer-events-none"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar flag"
          />
        </div>
        <Select
          value={enabledFilter}
          onValueChange={(v) => setEnabledFilter(v as EnabledFilter)}
          className="w-full sm:w-[180px]"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'enabled', label: 'Activados' },
            { value: 'disabled', label: 'Desactivados' },
          ]}
        />
      </div>
      <Button variant="primary" onClick={() => setCreateOpen(true)} className="shrink-0">
        <Plus size={16} className="mr-1.5" />
        Crear nuevo flag
      </Button>
    </div>
  );

  if (flags === null) {
    return (
      <div className="space-y-4">
        {toolbar}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCards />
        </div>
      </div>
    );
  }

  const hasFlags = flags.length > 0;
  const visible = filteredFlags ?? [];

  return (
    <div className="space-y-4">
      {toolbar}

      {!hasFlags ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-[var(--neutral-500)]">
            Aún no hay feature flags configurados. Creá el primero con el botón de arriba.
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
            No hay flags que coincidan con los filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((flag) => (
            <FlagCard
              key={flag.key}
              flag={flag}
              onToggle={handleToggle}
              onDescriptionSave={handleDescriptionSave}
            />
          ))}
        </div>
      )}

      <CreateFlagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingKeys={existingKeys}
        onCreated={handleCreated}
      />
    </div>
  );
}
