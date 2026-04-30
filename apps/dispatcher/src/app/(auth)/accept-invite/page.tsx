'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Stage = 'verifying' | 'set-password' | 'error';

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm">
          <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
            <p className="text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
              Validando invitación…
            </p>
          </div>
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<Stage>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Supabase puede mandar el invite por dos flujos según la versión del
    // proyecto: PKCE (`?code=...`) o legacy/OTP (`?token_hash=...&type=invite`).
    // Soportamos ambos.
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    async function verify() {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStage('set-password');
          return;
        }
        if (tokenHash) {
          // type puede venir como 'invite' o 'signup' según la config.
          // Si no viene, probamos 'invite' por defecto (es el caso real
          // del flujo admin-invite-staff).
          const otpType = (type === 'signup' ? 'signup' : 'invite') as
            | 'invite'
            | 'signup';
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (error) throw error;
          setStage('set-password');
          return;
        }
        setErrorMsg(
          'El enlace de invitación es inválido. Pedile al admin que te reenvíe la invitación.',
        );
        setStage('error');
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'No pudimos validar el link de invitación.';
        setErrorMsg(`${msg} El link puede haber expirado o ya haberse usado.`);
        setStage('error');
      }
    }

    void verify();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      // Tras setear la pass el usuario ya tiene sesión activa. Lo redirigimos
      // según su rol (el middleware/login ya hace eso, pero acá podemos
      // ahorrarnos un round-trip mirando el profile).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let target = '/';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        const role = (profile as { role?: string } | null)?.role;
        if (role === 'admin') target = '/admin';
        else if (role === 'dispatcher') target = '/';
        else target = '/login';
      }

      toast.success('¡Listo! Te damos la bienvenida al equipo.');
      router.push(target);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No pudimos guardar la contraseña.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-family-display)] font-bold text-[var(--text-2xl)] text-[var(--neutral-900)] tracking-tight">
            Activá tu cuenta
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--neutral-500)] mt-1">
            Elegí una contraseña para terminar de crearla.
          </p>
        </div>

        {stage === 'verifying' && (
          <p className="text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
            Validando invitación…
          </p>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <p
              role="alert"
              className="text-[var(--text-sm)] text-[var(--danger)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2"
            >
              {errorMsg}
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Ir al login
            </Button>
          </div>
        )}

        {stage === 'set-password' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="confirm_password">Confirmar contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={submitting}
            >
              {submitting ? 'Activando…' : 'Activar cuenta'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
