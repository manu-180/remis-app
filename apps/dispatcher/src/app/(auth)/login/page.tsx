'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // MFA challenge state
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      toast.success('Te enviamos un email con instrucciones para recuperar tu contraseña.');
      setResetOpen(false);
      setResetEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el email de recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  async function redirectByRole(userId: string) {
    const supabase = getSupabaseBrowserClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null; error: unknown };

    if (!profile || !['dispatcher', 'admin'].includes(profile.role)) {
      await supabase.auth.signOut();
      throw new Error('No tenés permisos para acceder al panel.');
    }

    if (profile.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) throw signInError;

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
        setPendingUserId(data.user.id);
        setMfaCode('');
        setMfaError('');
        setMfaOpen(true);
        return;
      }

      await redirectByRole(data.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión. Verificá tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6 || !pendingUserId) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) throw factorsErr;
      const totp = factors?.totp?.[0];
      if (!totp) {
        setMfaError('No se encontró un factor 2FA configurado.');
        return;
      }

      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      });
      if (challengeErr || !challenge) throw challengeErr ?? new Error('challenge failed');

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: totp.id,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyErr) {
        setMfaError('Código incorrecto');
        return;
      }

      setMfaOpen(false);
      await redirectByRole(pendingUserId);
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'No se pudo verificar el código.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaCancel = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMfaOpen(false);
    setMfaCode('');
    setMfaError('');
    setPendingUserId(null);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-family-display)] font-bold text-[var(--text-2xl)] text-[var(--neutral-900)] tracking-tight">
            RemisDespacho
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--neutral-500)] mt-1">
            Panel de despacho
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-[var(--text-sm)] font-medium text-[var(--neutral-700)]">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-[var(--text-sm)] font-medium text-[var(--neutral-700)]">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-[var(--text-sm)] text-[var(--danger)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? 'Ingresando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setResetOpen(true);
            }}
            className="text-[var(--text-sm)] text-[var(--neutral-500)] hover:text-[var(--brand-primary)] transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </p>
      </div>

      <p className="text-center text-[var(--text-xs)] text-[var(--neutral-500)] mt-4">
        v0.1.0
      </p>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>
              Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="reset_email">Email</Label>
              <Input
                id="reset_email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setResetOpen(false)}
                disabled={resetLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={resetLoading || !resetEmail}>
                {resetLoading ? 'Enviando…' : 'Enviar email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mfaOpen}
        onOpenChange={(open) => {
          if (!open) {
            void handleMfaCancel();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autenticación en dos pasos</DialogTitle>
            <DialogDescription>
              Ingresá el código de 6 dígitos que aparece en tu app de autenticación.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="mfa_code">Código</Label>
              <Input
                id="mfa_code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => {
                  setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (mfaError) setMfaError('');
                }}
                autoComplete="one-time-code"
                required
                autoFocus
              />
              {mfaError && (
                <p className="text-[var(--text-sm)] text-[var(--danger)] mt-1">{mfaError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={handleMfaCancel}
                disabled={mfaLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={mfaLoading || mfaCode.length !== 6}
              >
                {mfaLoading ? 'Verificando…' : 'Verificar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
