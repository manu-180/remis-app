'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useZones } from '@/hooks/use-zones';
import type { TariffZone, UpdateZoneInput } from '@/hooks/use-zones';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerClose } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ZoneEditor } from './zone-editor-wrapper';
import { ZONE_COLORS } from './zone-editor';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zone card
// ---------------------------------------------------------------------------
interface ZoneCardProps {
  zone: TariffZone;
  selected: boolean;
  onClick: () => void;
  onUpdate: (id: string, patch: UpdateZoneInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function ZoneCard({ zone, selected, onClick, onUpdate, onRemove }: ZoneCardProps) {
  const confirm = useConfirm();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(zone.name);
  const [savingActive, setSavingActive] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = ZONE_COLORS[(zone.priority - 1) % 4];

  async function saveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === zone.name) {
      setNameValue(zone.name);
      setEditingName(false);
      return;
    }
    await onUpdate(zone.id, { name: trimmed });
    setEditingName(false);
  }

  async function toggleActive(checked: boolean) {
    setSavingActive(true);
    try {
      await onUpdate(zone.id, { is_active: checked });
    } finally {
      setSavingActive(false);
    }
  }

  async function changePriority(delta: number) {
    const next = Math.max(1, zone.priority + delta);
    if (next === zone.priority) return;
    setSavingPriority(true);
    try {
      await onUpdate(zone.id, { priority: next });
    } finally {
      setSavingPriority(false);
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: '¿Eliminar zona?',
      description: `Se eliminará la zona "${zone.name}" de forma permanente.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setRemoving(true);
    try {
      await onRemove(zone.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-md)] cursor-pointer',
        'border border-[var(--neutral-200)] transition-all duration-[var(--dur-fast)]',
        'hover:bg-[var(--neutral-50)]',
        selected
          ? 'border-l-4 border-l-[var(--brand-primary)] bg-[var(--neutral-50)]'
          : 'border-l-4 border-l-transparent'
      )}
    >
      {/* Row 1: dot + name + trash */}
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 rounded-full"
          style={{ width: 8, height: 8, background: color }}
        />

        {editingName ? (
          <input
            ref={inputRef}
            className={cn(
              'flex-1 min-w-0 text-sm font-medium bg-transparent outline-none',
              'border-b border-[var(--brand-primary)] text-[var(--neutral-900)]'
            )}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') { setNameValue(zone.name); setEditingName(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="flex-1 min-w-0 text-sm font-medium text-[var(--neutral-900)] truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
              setTimeout(() => inputRef.current?.select(), 0);
            }}
            title="Doble click para editar"
          >
            {zone.name}
          </span>
        )}

        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--neutral-400)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors duration-[var(--dur-fast)] disabled:opacity-50"
          aria-label="Eliminar zona"
        >
          {removing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>

      {/* Row 2: active switch + priority */}
      <div className="flex items-center justify-between pl-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Switch
            checked={zone.is_active}
            onCheckedChange={toggleActive}
            disabled={savingActive}
            aria-label="Zona activa"
          />
          <span className="text-xs text-[var(--neutral-500)]">
            {zone.is_active ? 'Activa' : 'Inactiva'}
          </span>
          {savingActive && <Loader2 size={11} className="animate-spin text-[var(--neutral-400)]" />}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changePriority(-1)}
            disabled={savingPriority || zone.priority <= 1}
            className="w-5 h-5 flex items-center justify-center rounded text-xs text-[var(--neutral-600)] hover:bg-[var(--neutral-200)] disabled:opacity-30 transition-colors"
            aria-label="Bajar prioridad"
          >
            −
          </button>
          <span className="text-xs font-semibold text-[var(--neutral-700)] w-4 text-center">
            {zone.priority}
          </span>
          <button
            type="button"
            onClick={() => changePriority(1)}
            disabled={savingPriority}
            className="w-5 h-5 flex items-center justify-center rounded text-xs text-[var(--neutral-600)] hover:bg-[var(--neutral-200)] disabled:opacity-30 transition-colors"
            aria-label="Subir prioridad"
          >
            +
          </button>
          {savingPriority && <Loader2 size={11} className="animate-spin text-[var(--neutral-400)]" />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------
export function ZonesClient() {
  const { zones, isLoading, error, create, update, remove } = useZones();
  const confirm = useConfirm();

  // Selection & drawing state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [editingZoneId] = useState<string | null>(null);

  // Confirm zone drawer state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZonePriority, setNewZonePriority] = useState(1);
  const [newZoneActive, setNewZoneActive] = useState(true);
  const [creating, setCreating] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleDrawingComplete = useCallback(
    (wktPolygon: string, _coords: [number, number][]) => {
      setPendingPolygon(wktPolygon);
      setNewZoneName('');
      setNewZonePriority((zones.length || 0) + 1);
      setNewZoneActive(true);
      setDrawingMode(false);
      setConfirmOpen(true);
    },
    [zones.length]
  );

  const handleDrawingCancel = useCallback(() => {
    setDrawingMode(false);
  }, []);

  const handleZoneClick = useCallback((id: string) => {
    setSelectedZoneId((prev) => (prev === id ? null : id));
  }, []);

  const handleUpdate = useCallback(
    async (id: string, patch: UpdateZoneInput) => {
      await update(id, patch);
    },
    [update]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      await remove(id);
      setSelectedZoneId((prev) => (prev === id ? null : prev));
    },
    [remove]
  );

  const handleVerticesUpdate = useCallback(
    async (id: string, newWkt: string) => {
      await update(id, { polygon: newWkt });
    },
    [update]
  );

  async function handleCreateZone() {
    if (!pendingPolygon) return;
    const trimmedName = newZoneName.trim();
    if (!trimmedName) return;
    setCreating(true);
    try {
      await create({
        name: trimmedName,
        polygon: pendingPolygon,
        priority: newZonePriority,
        is_active: newZoneActive,
      });
      setConfirmOpen(false);
      setPendingPolygon(null);
    } catch (e) {
      // surface error inline — caller can see console
      console.error('Error creating zone', e);
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Confirm dialog for cancel drawing (not really needed, kept for completeness)
  // ---------------------------------------------------------------------------
  async function handleCancelDrawingWithConfirm() {
    if (drawingMode) {
      const ok = await confirm({
        title: '¿Cancelar dibujo?',
        description: 'Se perderán los puntos dibujados.',
        confirmLabel: 'Cancelar dibujo',
        danger: false,
      });
      if (ok) setDrawingMode(false);
    } else {
      setDrawingMode(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col shrink-0 border-r border-[var(--neutral-200)] bg-[var(--neutral-0)] overflow-hidden"
        style={{ width: 320 }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--neutral-200)] shrink-0">
          <Button
            variant={drawingMode ? 'destructive' : 'primary'}
            size="sm"
            className="w-full"
            onClick={drawingMode ? handleCancelDrawingWithConfirm : () => setDrawingMode(true)}
          >
            {drawingMode ? (
              'Cancelar dibujo'
            ) : (
              <>
                <Plus size={15} />
                Nueva zona
              </>
            )}
          </Button>
          {drawingMode && (
            <p className="mt-2 text-xs text-center text-[var(--brand-accent)]">
              Dibujando… click en el mapa para agregar puntos
            </p>
          )}
        </div>

        {/* Zone list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-md)]" />
            ))
          ) : error ? (
            <p className="text-xs text-[var(--danger)] text-center py-4">
              Error al cargar zonas
            </p>
          ) : zones.length === 0 ? (
            <p className="text-xs text-[var(--neutral-500)] text-center py-8">
              Sin zonas — dibujá la primera
            </p>
          ) : (
            zones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                selected={selectedZoneId === zone.id}
                onClick={() => handleZoneClick(zone.id)}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-[var(--neutral-200)] shrink-0">
          <p className="text-xs text-[var(--neutral-400)] text-center">
            {zones.length} zona{zones.length !== 1 ? 's' : ''} definida{zones.length !== 1 ? 's' : ''}
          </p>
        </div>
      </aside>

      {/* ── Map ── */}
      <div className="flex-1 overflow-hidden relative">
        <ZoneEditor
          zones={zones}
          selectedZoneId={selectedZoneId}
          onZoneClick={handleZoneClick}
          drawingMode={drawingMode}
          onDrawingComplete={handleDrawingComplete}
          onDrawingCancel={handleDrawingCancel}
          editingZoneId={editingZoneId}
          onVerticesUpdate={handleVerticesUpdate}
        />
      </div>

      {/* ── Confirm new zone drawer ── */}
      <Drawer
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setPendingPolygon(null);
          }
        }}
        title="Confirmar zona"
        width="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="zone-name">Nombre</Label>
            <Input
              id="zone-name"
              placeholder="Ej. Centro, Zona Sur…"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateZone();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zone-priority">Prioridad</Label>
            <Input
              id="zone-priority"
              type="number"
              min={1}
              value={newZonePriority}
              onChange={(e) => setNewZonePriority(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="zone-active"
              checked={newZoneActive}
              onCheckedChange={setNewZoneActive}
            />
            <Label htmlFor="zone-active">Activa</Label>
          </div>
        </div>

        <DrawerClose asChild>
          <Button
            variant="primary"
            className="w-full mt-6"
            disabled={creating || !newZoneName.trim()}
            onClick={handleCreateZone}
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creando…
              </>
            ) : (
              'Crear zona'
            )}
          </Button>
        </DrawerClose>
      </Drawer>
    </div>
  );
}
