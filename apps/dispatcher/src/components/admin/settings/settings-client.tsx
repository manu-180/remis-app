/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useZodForm, z } from '@/lib/forms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrgSettings = {
  id: boolean;
  brand_name: string;
  logo_url: string | null;
  timezone: string;
  alert_emails: string[];
  webhook_url: string | null;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Timezone options
// ---------------------------------------------------------------------------
const TIMEZONE_OPTIONS = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'America/Argentina/Cordoba', label: 'Córdoba (UTC-3)' },
  { value: 'America/Argentina/Mendoza', label: 'Mendoza (UTC-3)' },
  { value: 'America/Argentina/Salta', label: 'Salta (UTC-3)' },
  { value: 'America/Argentina/Tucuman', label: 'Tucumán (UTC-3)' },
  { value: 'America/Argentina/Jujuy', label: 'Jujuy (UTC-3)' },
  { value: 'America/Argentina/San_Juan', label: 'San Juan (UTC-3)' },
  { value: 'America/Argentina/La_Rioja', label: 'La Rioja (UTC-3)' },
  { value: 'America/Argentina/Catamarca', label: 'Catamarca (UTC-3)' },
  { value: 'America/Argentina/Rio_Gallegos', label: 'Río Gallegos (UTC-3)' },
  { value: 'America/Argentina/Ushuaia', label: 'Ushuaia (UTC-3)' },
];

// ---------------------------------------------------------------------------
// SaveFeedback helper
// ---------------------------------------------------------------------------
function SaveFeedback({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-sm text-[var(--success)] mt-2">&#10003; Cambios guardados</p>
  );
}

// ---------------------------------------------------------------------------
// SkeletonFields — loading state
// ---------------------------------------------------------------------------
function SkeletonFields({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Organización
// ---------------------------------------------------------------------------
function OrganizationTab({ settings }: { settings: OrgSettings | null }) {
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setBrandName(settings.brand_name ?? '');
      setLogoUrl(settings.logo_url ?? '');
      setTimezone(settings.timezone ?? 'America/Argentina/Buenos_Aires');
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    await (supabase as any)
      .from('org_settings')
      .update({
        brand_name: brandName,
        logo_url: logoUrl || null,
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!settings) return <SkeletonFields count={3} />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="brand_name">Nombre comercial</Label>
        <Input
          id="brand_name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Ej: Remis El Pampa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo_url">Logo URL</Label>
        <Input
          id="logo_url"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://ejemplo.com/logo.png"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Zona horaria</Label>
        <Select
          id="timezone"
          options={TIMEZONE_OPTIONS}
          value={timezone}
          onValueChange={setTimezone}
          placeholder="Seleccionar zona horaria..."
        />
      </div>

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <SaveFeedback show={saved} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Notificaciones
// ---------------------------------------------------------------------------
function NotificationsTab({ settings }: { settings: OrgSettings | null }) {
  const [alertEmailsText, setAlertEmailsText] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setAlertEmailsText((settings.alert_emails ?? []).join('\n'));
      setWebhookUrl(settings.webhook_url ?? '');
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const emails = alertEmailsText
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean);
    await (supabase as any)
      .from('org_settings')
      .update({
        alert_emails: emails,
        webhook_url: webhookUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!settings) return <SkeletonFields count={2} />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="alert_emails">Emails para alertas SOS</Label>
        <Textarea
          id="alert_emails"
          value={alertEmailsText}
          onChange={(e) => setAlertEmailsText(e.target.value)}
          placeholder="admin@ejemplo.com"
          rows={4}
        />
        <p className="text-xs text-[var(--neutral-500)]">Un email por línea</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhook_url">Webhook URL</Label>
        <Input
          id="webhook_url"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.ejemplo.com/sos"
        />
      </div>

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <SaveFeedback show={saved} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password change — schema + strength meter
// ---------------------------------------------------------------------------
const ChangePasswordSchema = z
  .object({
    current: z.string().min(1, 'Ingresá tu contraseña actual'),
    next: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres')
      .regex(/[A-Z]/, 'Necesita al menos una mayúscula')
      .regex(/[0-9]/, 'Necesita al menos un número'),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })
  .refine((d) => d.next === '' || d.next !== d.current, {
    message: 'La nueva contraseña debe ser diferente',
    path: ['next'],
  });

type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;

function passwordStrength(value: string): { score: 0 | 1 | 2 | 3; label: string; tone: string } {
  if (!value) return { score: 0, label: '', tone: 'bg-[var(--neutral-200)]' };
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score++;
  if (value.length >= 12 && /[^A-Za-z0-9]/.test(value)) score++;
  const map = [
    { label: 'Muy débil', tone: 'bg-[var(--danger)]' },
    { label: 'Débil', tone: 'bg-[var(--danger)]' },
    { label: 'Aceptable', tone: 'bg-[var(--warning,#facc15)]' },
    { label: 'Fuerte', tone: 'bg-[var(--success)]' },
  ] as const;
  return { score: score as 0 | 1 | 2 | 3, ...map[score as 0 | 1 | 2 | 3] };
}

function PasswordChangeSection() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    reset,
    watch,
  } = useZodForm(ChangePasswordSchema, { current: '', next: '', confirm: '' });

  const next = watch('next') ?? '';
  const strength = passwordStrength(next);

  const onSubmit = async (values: ChangePasswordValues) => {
    const sb = getSupabaseBrowserClient();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData.user?.email) {
      toast.error('No se pudo identificar tu sesión actual. Volvé a iniciar sesión.');
      return;
    }

    const { error: authErr } = await sb.auth.signInWithPassword({
      email: userData.user.email,
      password: values.current,
    });
    if (authErr) {
      setError('current', { message: 'Contraseña actual incorrecta' });
      return;
    }

    const { error: updErr } = await sb.auth.updateUser({ password: values.next });
    if (updErr) {
      // NOTE: Supabase rate-limits auth.updateUser({ password }) a nivel proyecto.
      // Si querés limit más estricto, agregalo en una edge function.
      toast.error(updErr.message);
      return;
    }

    await (sb as any).rpc('log_security_event', { p_action: 'password_changed' });

    toast.success('Contraseña actualizada');
    reset({ current: '', next: '', confirm: '' });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-[var(--neutral-900)]">Cambiar contraseña</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="current_password">Contraseña actual</Label>
          <PasswordInput
            id="current_password"
            placeholder="Contraseña actual"
            autoComplete="current-password"
            aria-invalid={!!errors.current}
            {...register('current')}
          />
          {errors.current && (
            <p className="text-sm text-[var(--danger)]">{errors.current.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new_password">Nueva contraseña</Label>
          <PasswordInput
            id="new_password"
            placeholder="Mínimo 8 caracteres, mayúscula y número"
            autoComplete="new-password"
            aria-invalid={!!errors.next}
            {...register('next')}
          />
          {next && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-[var(--neutral-200)] overflow-hidden">
                <div
                  className={`h-full transition-all ${strength.tone}`}
                  style={{ width: `${((strength.score + 1) / 4) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[var(--neutral-500)]">{strength.label}</p>
            </div>
          )}
          {errors.next && (
            <p className="text-sm text-[var(--danger)]">{errors.next.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
          <PasswordInput
            id="confirm_password"
            placeholder="Repetí la nueva contraseña"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register('confirm')}
          />
          {errors.confirm && (
            <p className="text-sm text-[var(--danger)]">{errors.confirm.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2FA TOTP section
// ---------------------------------------------------------------------------
type TotpFactor = { id: string; status: string };

function TwoFactorSection() {
  const sb = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<TotpFactor | null>(null);

  // Enroll dialog state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Disable dialog state
  const [disableOpen, setDisableOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const refreshFactor = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) {
      toast.error('No se pudieron leer los factores 2FA.');
      setLoading(false);
      return;
    }
    const totp = data?.totp?.[0] ?? null;
    setFactor(totp ? { id: totp.id, status: totp.status } : null);
    setLoading(false);
  }, [sb]);

  useEffect(() => {
    void refreshFactor();
  }, [refreshFactor]);

  const enabled = factor?.status === 'verified';

  async function startEnroll() {
    setEnrollLoading(true);
    setVerifyError(null);
    setCode('');
    try {
      // Si quedó un factor unverified previo, removerlo para no chocar.
      if (factor && factor.status !== 'verified') {
        await sb.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
      if (error || !data) throw error ?? new Error('No se pudo iniciar el enrolamiento');
      setEnrollFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrollOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar 2FA.');
    } finally {
      setEnrollLoading(false);
    }
  }

  async function cancelEnroll() {
    if (enrollFactorId) {
      await sb.auth.mfa.unenroll({ factorId: enrollFactorId });
    }
    closeEnrollDialog();
    void refreshFactor();
  }

  function closeEnrollDialog() {
    setEnrollOpen(false);
    setEnrollFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode('');
    setVerifyError(null);
  }

  async function confirmEnroll() {
    if (!enrollFactorId || code.length !== 6) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const { data: challenge, error: challengeErr } = await sb.auth.mfa.challenge({
        factorId: enrollFactorId,
      });
      if (challengeErr || !challenge) throw challengeErr ?? new Error('challenge failed');
      const { error: verifyErr } = await sb.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) {
        setVerifyError('Código incorrecto. Probá de nuevo.');
        return;
      }
      await (sb as any).rpc('log_security_event', { p_action: 'mfa_enabled' });
      toast.success('2FA activada');
      closeEnrollDialog();
      await refreshFactor();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'No se pudo verificar el código.');
    } finally {
      setVerifying(false);
    }
  }

  async function confirmDisable() {
    if (!factor) return;
    setDisabling(true);
    try {
      const { error } = await sb.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      await (sb as any).rpc('log_security_event', { p_action: 'mfa_disabled' });
      toast.success('2FA desactivada');
      setDisableOpen(false);
      await refreshFactor();
    } finally {
      setDisabling(false);
    }
  }

  return (
    <div className="space-y-3 pt-4 border-t border-[var(--neutral-100)]">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-[var(--neutral-900)]">Autenticación en dos pasos</h3>
        {enabled && (
          <Badge className="bg-[var(--success-bg,_var(--neutral-100))] text-[var(--success)]">
            Activa
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="twofa"
          checked={enabled}
          disabled={loading || enrollLoading}
          onCheckedChange={(checked) => {
            if (checked) {
              void startEnroll();
            } else {
              setDisableOpen(true);
            }
          }}
          aria-label="Autenticación en dos pasos"
        />
        <Label htmlFor="twofa" className="text-[var(--neutral-700)]">
          {enabled ? 'Activada — exigirá código en cada login' : 'Activar autenticación en dos pasos'}
        </Label>
      </div>

      <p className="text-sm text-[var(--neutral-500)]">
        Usa una app como Google Authenticator, Authy o 1Password. Si perdés tu dispositivo,
        contactá al administrador del sistema para desactivarla.
      </p>

      {/* Enroll dialog */}
      <Dialog
        open={enrollOpen}
        onOpenChange={(open) => {
          if (!open) {
            void cancelEnroll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar autenticación en dos pasos</DialogTitle>
            <DialogDescription>
              Escaneá el código QR con tu app (Google Authenticator, Authy, 1Password, etc.) y
              después ingresá el código de 6 dígitos que aparece en la app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL devuelto por Supabase MFA, next/image no aplica */}
                <img
                  src={qrCode}
                  alt="Código QR para configurar 2FA"
                  width={200}
                  height={200}
                  className="rounded-md border border-[var(--neutral-200)] bg-white p-2"
                />
              </div>
            )}

            {secret && (
              <details className="text-sm text-[var(--neutral-600)]">
                <summary className="cursor-pointer hover:text-[var(--neutral-900)]">
                  ¿No podés escanear?
                </summary>
                <p className="mt-2">
                  Ingresá manualmente este código en tu app:
                </p>
                <code className="mt-1 block break-all rounded bg-[var(--neutral-100)] px-2 py-1 font-mono text-xs">
                  {secret}
                </code>
              </details>
            )}

            <div className="space-y-2">
              <Label htmlFor="totp_code">Código de verificación</Label>
              <Input
                id="totp_code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (verifyError) setVerifyError(null);
                }}
                autoComplete="one-time-code"
                autoFocus
              />
              {verifyError && (
                <p className="text-sm text-[var(--danger)]">{verifyError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={cancelEnroll} disabled={verifying}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmEnroll}
              disabled={verifying || code.length !== 6}
            >
              {verifying ? 'Verificando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Desactivar 2FA?</DialogTitle>
            <DialogDescription>
              Si la desactivás, tu cuenta quedará protegida solo por contraseña. Podés volver a
              activarla en cualquier momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDisableOpen(false)}
              disabled={disabling}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDisable}
              disabled={disabling}
            >
              {disabling ? 'Desactivando…' : 'Desactivar 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Cuenta
// ---------------------------------------------------------------------------
function AccountTab() {
  return (
    <div className="space-y-8">
      <PasswordChangeSection />
      <TwoFactorSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------
export function SettingsClient() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await (supabase as any)
        .from('org_settings')
        .select('*')
        .single();
      setSettings(data ?? null);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  return (
    <Tabs defaultValue="organization">
      <TabsList className="bg-[var(--neutral-100)] text-[var(--neutral-600)]">
        <TabsTrigger value="organization">Organización</TabsTrigger>
        <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
        <TabsTrigger value="account">Cuenta</TabsTrigger>
      </TabsList>

      {/* Organización */}
      <TabsContent value="organization">
        <Card>
          <CardContent className="pt-6">
            {loading ? <SkeletonFields count={3} /> : <OrganizationTab settings={settings} />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notificaciones */}
      <TabsContent value="notifications">
        <Card>
          <CardContent className="pt-6">
            {loading ? <SkeletonFields count={2} /> : <NotificationsTab settings={settings} />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Cuenta */}
      <TabsContent value="account">
        <Card>
          <CardContent className="pt-6">
            <AccountTab />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
