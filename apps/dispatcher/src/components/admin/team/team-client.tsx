'use client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any

import { useState, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Drawer } from '@/components/ui/drawer';
import { useConfirm } from '@/components/admin/confirm-dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
  last_sign_in_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `hace ${days} días`;
}

function getInitials(fullName: string | null): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Staff card
// ---------------------------------------------------------------------------
interface StaffCardProps {
  member: StaffMember;
  onChangeRole: (id: string, newRole: string) => Promise<void>;
  onDelete: (id: string, name: string | null) => Promise<void>;
}

function StaffCard({ member, onChangeRole, onDelete }: StaffCardProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = member.role === 'admin';
  const newRole = isAdmin ? 'dispatcher' : 'admin';
  const newRoleLabel = isAdmin ? 'Despachador' : 'Administrador';

  async function handleChangeRole() {
    setActionLoading(true);
    try {
      await onChangeRole(member.id, newRole);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await onDelete(member.id, member.full_name);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center text-center p-6 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Avatar */}
      <div className="mb-3">
        {member.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar_url}
            alt={member.full_name ?? 'Avatar'}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: 'color-mix(in srgb, var(--brand) 20%, transparent)',
              color: 'var(--brand)',
            }}
          >
            {getInitials(member.full_name)}
          </div>
        )}
      </div>

      {/* Name & email */}
      <p className="font-semibold text-[var(--neutral-900)] text-sm leading-snug">
        {member.full_name ?? '—'}
      </p>
      <p className="text-xs text-[var(--neutral-500)] mt-0.5 truncate w-full">
        {member.email ?? '—'}
      </p>

      {/* Role pill */}
      <div className="mt-2 mb-1">
        {isAdmin ? (
          <span
            className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--brand) 20%, transparent)',
              color: 'var(--brand)',
            }}
          >
            admin
          </span>
        ) : (
          <span
            className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--neutral-200)] text-[var(--neutral-600)]"
          >
            dispatcher
          </span>
        )}
      </div>

      {/* Last login */}
      <p className="text-xs text-[var(--neutral-500)] mt-1">
        Último login: {relativeTime(member.last_sign_in_at)}
      </p>

      {/* Actions */}
      <div className="mt-4 flex gap-2 w-full">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleChangeRole}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            `→ ${newRoleLabel}`
          )}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={actionLoading}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------
export function TeamClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const confirm = useConfirm();

  const [members, setMembers] = useState<StaffMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Invite drawer state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('dispatcher');

  // Load
  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('list_staff') as { data: StaffMember[] | null; error: any };
      if (error) {
        const msg: string = error?.message ?? String(error);
        if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('permission')) {
          setLoadError('No tienes permisos para ver el equipo.');
        } else {
          setLoadError(msg);
        }
        return;
      }
      setMembers(data ?? []);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Change role
  async function handleChangeRole(id: string, newRole: string) {
    const newRoleLabel = newRole === 'admin' ? 'Administrador' : 'Despachador';
    const ok = await confirm({
      title: `¿Cambiar rol a ${newRoleLabel}?`,
      description: 'El miembro recibirá los permisos del nuevo rol de inmediato.',
      confirmLabel: 'Cambiar',
    });
    if (!ok) return;

    // Optimistic update
    setMembers((prev) =>
      prev
        ? prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
        : prev,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id) as { error: any };
    if (error) {
      // Revert on failure
      setMembers((prev) =>
        prev
          ? prev.map((m) =>
              m.id === id
                ? { ...m, role: newRole === 'admin' ? 'dispatcher' : 'admin' }
                : m,
            )
          : prev,
      );
    }
  }

  // Delete (soft)
  async function handleDelete(id: string, name: string | null) {
    const ok = await confirm({
      title: `¿Eliminar a ${name ?? 'este miembro'}?`,
      description: 'El acceso quedará deshabilitado. Esta acción puede revertirse desde Supabase.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('id', id) as { error: any };

    if (!error) {
      setMembers((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Error state
  if (loadError) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-12 text-center text-sm text-[var(--neutral-600)]">
        {loadError}
      </div>
    );
  }

  // Loading skeleton
  if (members === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--neutral-500)]">
          {members.length} {members.length === 1 ? 'miembro' : 'miembros'} en el equipo
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus size={14} />
          Invitar miembro
        </Button>
      </div>

      {/* Cards grid */}
      {members.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-12 text-center text-sm text-[var(--neutral-500)]">
          No hay miembros en el equipo todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onChangeRole={handleChangeRole}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Invite drawer */}
      <Drawer
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invitar nuevo miembro"
        width="sm"
      >
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="usuario@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Rol</Label>
            <div className="mt-1">
              <Select
                options={[
                  { value: 'dispatcher', label: 'Despachador' },
                  { value: 'admin', label: 'Administrador' },
                ]}
                value={inviteRole}
                onValueChange={setInviteRole}
              />
            </div>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--neutral-50)] text-sm text-[var(--neutral-600)]">
            <strong>TODO:</strong> La invitación por email requiere implementar la edge function{' '}
            <code>admin-invite-staff</code>. Por ahora, crear el usuario manualmente en Supabase Auth
            y ejecutar:
            <br />
            <code className="text-xs">
              UPDATE profiles SET role = &apos;{inviteRole}&apos; WHERE email = &apos;{inviteEmail || 'email'}&apos;;
            </code>
          </div>
        </div>
        <div className="pt-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => setInviteOpen(false)}
          >
            Cerrar (TODO: implementar invite)
          </Button>
        </div>
      </Drawer>
    </>
  );
}
