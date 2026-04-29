'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { ScrollText } from 'lucide-react';

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

// ---------------------------------------------------------------------------
// History Drawer content
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
          {/* vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-[var(--neutral-200)]" />
          {history.map((entry) => (
            <div key={entry.created_at} className="relative">
              {/* dot */}
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
          {/* Header row: key + switch */}
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
              aria-label={`Toggle ${flag.key}`}
            />
          </div>

          {/* Description — inline edit on double click */}
          {editing ? (
            <input
              ref={inputRef}
              className="w-full text-sm text-[var(--neutral-700)] bg-[var(--neutral-50)] border border-[var(--neutral-300)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              placeholder="Agregar descripción..."
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

          {/* Footer row: timestamp + history button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[var(--neutral-400)]">
              Actualizado: {relativeTime(flag.updated_at)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-700)]"
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
// Main client component
// ---------------------------------------------------------------------------
export function FeatureFlagsClient() {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);

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

  async function handleToggle(key: string, newEnabled: boolean) {
    // Optimistic update
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
      // Revert on failure
      setFlags((prev) =>
        prev
          ? prev.map((f) =>
              f.key === key ? { ...f, enabled: !newEnabled } : f,
            )
          : prev,
      );
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

  if (flags === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SkeletonCards />
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[var(--neutral-500)]">No hay feature flags configurados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {flags.map((flag) => (
        <FlagCard
          key={flag.key}
          flag={flag}
          onToggle={handleToggle}
          onDescriptionSave={handleDescriptionSave}
        />
      ))}
    </div>
  );
}
