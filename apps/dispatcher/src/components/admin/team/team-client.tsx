'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, Mail, RefreshCw } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import { useZodForm, z } from '@/lib/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Drawer } from '@/components/ui/drawer';
import { toast } from '@/components/ui/use-toast';
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

interface PendingInvite {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  invited_at: string | null;
}

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------
const inviteSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  role: z.enum(['dispatcher', 'admin']),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

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
    <div className="flex flex-col items-center text-center p-6 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200">
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

      <p className="font-semibold text-[var(--neutral-900)] text-sm leading-snug">
        {member.full_name ?? '—'}
      </p>
      <p className="text-xs text-[var(--neutral-500)] mt-0.5 truncate w-full">
        {member.email ?? '—'}
      </p>

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
          <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--neutral-200)] text-[var(--neutral-600)]">
            dispatcher
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--neutral-500)] mt-1">
        Último login: {relativeTime(member.last_sign_in_at)}
      </p>

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
// Pending invite card
// ---------------------------------------------------------------------------
interface PendingCardProps {
  invite: PendingInvite;
  onResend: (invite: PendingInvite) => Promise<void>;
}

function PendingCard({ invite, onResend }: PendingCardProps) {
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await onResend(invite);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center p-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)]">
      <div className="mb-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--neutral-400) 20%, transparent)',
            color: 'var(--neutral-600)',
          }}
        >
          <Mail size={24} />
        </div>
      </div>

      <p className="font-semibold text-[var(--neutral-900)] text-sm leading-snug">
        {invite.full_name ?? '—'}
      </p>
      <p className="text-xs text-[var(--neutral-500)] mt-0.5 truncate w-full">
        {invite.email ?? '—'}
      </p>

      <div className="mt-2 mb-1 flex items-center gap-2">
        <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--neutral-200)] text-[var(--neutral-700)]">
          {invite.role}
        </span>
        <span
          className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--warning, #f59e0b) 20%, transparent)',
            color: 'var(--warning, #b45309)',
          }}
        >
          Pendiente
        </span>
      </div>

      <p className="text-xs text-[var(--neutral-500)] mt-1">
        Invitado: {relativeTime(invite.invited_at)}
      </p>

      <div className="mt-4 w-full">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <RefreshCw size={12} className="mr-1.5" />
              Reenviar invitación
            </>
          )}
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
  const [pending, setPending] = useState<PendingInvite[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const form = useZodForm(inviteSchema, {
    full_name: '',
    email: '',
    role: 'dispatcher',
  });

  const role = form.watch('role');

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    const [staffRes, pendingRes] = await Promise.all([
      supabase.rpc('list_staff'),
      supabase.rpc('list_pending_invites'),
    ]);

    if (staffRes.error) {
      const msg: string = staffRes.error?.message ?? String(staffRes.error);
      if (
        msg.toLowerCase().includes('forbidden') ||
        msg.toLowerCase().includes('permission')
      ) {
        setLoadError('No tienes permisos para ver el equipo.');
      } else {
        setLoadError(msg);
      }
      return;
    }
    setMembers((staffRes.data ?? []) as StaffMember[]);

    // pending puede fallar si la RPC todavía no se aplicó en la base; no
    // bloqueamos la UI en ese caso.
    if (pendingRes.error) {
      console.warn('[team] list_pending_invites failed:', pendingRes.error);
      setPending([]);
    } else {
      setPending((pendingRes.data ?? []) as PendingInvite[]);
    }
  }, [supabase]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // -------------------------------------------------------------------------
  // Invite submit
  // -------------------------------------------------------------------------
  async function sendInvite(values: InviteFormValues): Promise<{
    ok: boolean;
    status: number;
    body: Record<string, unknown>;
  }> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { ok: false, status: 401, body: { error: 'no-session' } };
    }
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-invite-staff`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      },
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, body };
  }

  async function handleInvite(values: InviteFormValues) {
    setInviteSubmitting(true);
    try {
      const result = await sendInvite(values);
      if (!result.ok) {
        if (result.status === 401) {
          toast.error('Sesión expirada. Volvé a iniciar sesión.');
          return;
        }
        if (result.status === 403) {
          toast.error('No tenés permisos para invitar.');
          return;
        }
        if (result.status === 409) {
          toast.error(`${values.email} ya está registrado.`);
          return;
        }
        const message =
          typeof result.body['message'] === 'string'
            ? (result.body['message'] as string)
            : 'No pudimos enviar la invitación.';
        toast.error(message);
        return;
      }

      toast.success(`Invitamos a ${values.email} con rol ${values.role}.`);
      form.reset({ full_name: '', email: '', role: 'dispatcher' });
      setInviteOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No pudimos enviar la invitación.',
      );
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleResend(invite: PendingInvite) {
    if (!invite.email || !invite.full_name) {
      toast.error('Datos del invite incompletos. Eliminá y volvé a invitar.');
      return;
    }
    const ok = await confirm({
      title: '¿Reenviar invitación?',
      description: `Le mandaremos un nuevo email a ${invite.email}.`,
      confirmLabel: 'Reenviar',
    });
    if (!ok) return;

    const result = await sendInvite({
      email: invite.email,
      full_name: invite.full_name,
      role: invite.role as 'admin' | 'dispatcher',
    });
    if (!result.ok && result.status !== 409) {
      const message =
        typeof result.body['message'] === 'string'
          ? (result.body['message'] as string)
          : 'No pudimos reenviar la invitación.';
      toast.error(message);
      return;
    }
    toast.success(`Reenviamos la invitación a ${invite.email}.`);
    await loadAll();
  }

  // -------------------------------------------------------------------------
  // Role + delete
  // -------------------------------------------------------------------------
  async function handleChangeRole(id: string, newRole: string) {
    const newRoleLabel = newRole === 'admin' ? 'Administrador' : 'Despachador';
    const ok = await confirm({
      title: `¿Cambiar rol a ${newRoleLabel}?`,
      description: 'El miembro recibirá los permisos del nuevo rol de inmediato.',
      confirmLabel: 'Cambiar',
    });
    if (!ok) return;

    setMembers((prev) =>
      prev ? prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)) : prev,
    );

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);
    if (error) {
      // Revert
      setMembers((prev) =>
        prev
          ? prev.map((m) =>
              m.id === id
                ? { ...m, role: newRole === 'admin' ? 'dispatcher' : 'admin' }
                : m,
            )
          : prev,
      );
      toast.error('No pudimos cambiar el rol.');
    }
  }

  async function handleDelete(id: string, name: string | null) {
    const ok = await confirm({
      title: `¿Eliminar a ${name ?? 'este miembro'}?`,
      description:
        'El acceso quedará deshabilitado. Esta acción puede revertirse desde Supabase.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setMembers((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
    } else {
      toast.error('No pudimos eliminar el miembro.');
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loadError) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-12 text-center text-sm text-[var(--neutral-600)]">
        {loadError}
      </div>
    );
  }

  if (members === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  const fullNameError = form.formState.errors.full_name?.message;
  const emailError = form.formState.errors.email?.message;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--neutral-500)]">
          {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          {pending && pending.length > 0 ? (
            <>
              {' · '}
              <span className="text-[var(--neutral-700)]">
                {pending.length} pendiente{pending.length === 1 ? '' : 's'}
              </span>
            </>
          ) : null}
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

      {/* Confirmed members */}
      {members.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-12 text-center text-sm text-[var(--neutral-500)]">
          No hay miembros confirmados todavía.
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

      {/* Pending invites */}
      {pending && pending.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--neutral-700)]">
            Invitaciones pendientes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pending.map((invite) => (
              <PendingCard
                key={invite.id}
                invite={invite}
                onResend={handleResend}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Invite drawer */}
      <Drawer
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            form.reset({ full_name: '', email: '', role: 'dispatcher' });
          }
        }}
        title="Invitar nuevo miembro"
        width="sm"
      >
        <form
          id="invite-form"
          onSubmit={form.handleSubmit(handleInvite)}
          className="flex flex-col gap-4"
        >
          <p className="text-sm text-[var(--neutral-600)]">
            Vamos a mandarle un email con un link para que active su cuenta y elija su contraseña.
          </p>

          <div>
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Ana Pérez"
              autoComplete="name"
              className="mt-1"
              {...form.register('full_name')}
            />
            {fullNameError && (
              <p className="text-xs text-[var(--danger)] mt-1">{fullNameError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@example.com"
              autoComplete="email"
              className="mt-1"
              {...form.register('email')}
            />
            {emailError && (
              <p className="text-xs text-[var(--danger)] mt-1">{emailError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Rol</Label>
            <div className="mt-1">
              <Select
                id="role"
                options={[
                  { value: 'dispatcher', label: 'Despachador' },
                  { value: 'admin', label: 'Administrador' },
                ]}
                value={role}
                onValueChange={(value) =>
                  form.setValue('role', value as 'admin' | 'dispatcher', {
                    shouldValidate: true,
                  })
                }
              />
            </div>
          </div>
        </form>

        <div className="pt-4 flex flex-col gap-2">
          <Button
            type="submit"
            form="invite-form"
            variant="primary"
            className="w-full"
            disabled={inviteSubmitting}
          >
            {inviteSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                Enviando…
              </>
            ) : (
              <>
                <Mail size={14} className="mr-1.5" />
                Enviar invitación
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setInviteOpen(false)}
            disabled={inviteSubmitting}
          >
            Cancelar
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
