'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) throw signInError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión. Verificá tus credenciales.');
    } finally {
      setLoading(false);
    }
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
          <a href="#" className="text-[var(--text-sm)] text-[var(--neutral-500)] hover:text-[var(--brand-primary)] transition-colors">
            ¿Olvidaste tu contraseña?
          </a>
        </p>
      </div>

      <p className="text-center text-[var(--text-xs)] text-[var(--neutral-500)] mt-4">
        v0.1.0
      </p>
    </div>
  );
}
