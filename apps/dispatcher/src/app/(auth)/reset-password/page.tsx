'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm">
          <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
            <p className="text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
              Cargando…
            </p>
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exchanging, setExchanging] = useState(true);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setExchanging(false);
      setExchangeError(
        'El enlace es inválido o expiró. Volvé a pedir un email de recuperación desde el login.',
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setExchangeError(
            'No pudimos validar el enlace. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".',
          );
        }
      })
      .finally(() => setExchanging(false));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success('Contraseña actualizada. Ya podés iniciar sesión.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-family-display)] font-bold text-[var(--text-2xl)] text-[var(--neutral-900)] tracking-tight">
            Nueva contraseña
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--neutral-500)] mt-1">
            Elegí una contraseña nueva para tu cuenta.
          </p>
        </div>

        {exchanging ? (
          <p className="text-center text-[var(--text-sm)] text-[var(--neutral-500)]">
            Validando enlace…
          </p>
        ) : exchangeError ? (
          <div className="flex flex-col gap-4">
            <p
              role="alert"
              className="text-[var(--text-sm)] text-[var(--danger)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2"
            >
              {exchangeError}
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Volver al login
            </Button>
          </div>
        ) : (
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
              {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
