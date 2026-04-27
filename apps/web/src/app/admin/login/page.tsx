'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setServerError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setServerError('Credenciales incorrectas. Verificá tu email y contraseña.');
        return;
      }
      const role = data.user?.user_metadata?.['role'] as string | undefined;
      if (role !== 'admin') {
        await supabase.auth.signOut();
        setServerError('Esta cuenta no tiene acceso al panel de administración.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-100)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)]">
            Remis <span className="text-[var(--brand-accent)]">Admin</span>
          </span>
          <p className="text-sm text-[var(--neutral-500)] mt-2">Acceso exclusivo para administradores</p>
        </div>

        <div className="bg-[var(--neutral-0)] rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {serverError && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 text-sm text-[var(--danger)]">
                {serverError}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--neutral-700)] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] text-[var(--neutral-900)] text-sm placeholder:text-[var(--neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-colors"
                placeholder="admin@remis.com.ar"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--neutral-700)] mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-[var(--radius-md)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] text-[var(--neutral-900)] text-sm placeholder:text-[var(--neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
