/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

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
// Tab: Cuenta
// ---------------------------------------------------------------------------
function AccountTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user?.email) {
        throw new Error('No se pudo identificar tu sesión actual. Volvé a iniciar sesión.');
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });
      if (signInErr) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      toast.success('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Password section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--neutral-900)]">Cambiar contraseña</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="current_password">Contraseña actual</Label>
            <Input
              id="current_password"
              type="password"
              placeholder="Contraseña actual"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">Nueva contraseña</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Repetí la nueva contraseña"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
          >
            {submitting ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </div>
      </div>

      {/* 2FA section */}
      <div className="space-y-3 pt-4 border-t border-[var(--neutral-100)]">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--neutral-900)]">Autenticación en dos pasos</h3>
          <Badge className="bg-[var(--neutral-100)] text-[var(--neutral-600)]">Próximamente</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="twofa"
            checked={false}
            disabled
            aria-label="Autenticación en dos pasos"
          />
          <Label htmlFor="twofa" className="text-[var(--neutral-500)]">
            Activar autenticación en dos pasos
          </Label>
        </div>
        <p className="text-sm text-[var(--neutral-500)]">
          Sumamos 2FA en la próxima versión para reforzar el acceso a la operación.
        </p>
      </div>
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
