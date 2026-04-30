# Prompt 05 — Cambio de password real + 2FA TOTP

## Objetivo

En el prompt 00 dejamos el cambio de password **funcional** (sin `alert()`) y el 2FA toggle **deshabilitado** con badge. Este prompt:

1. Asegura que el cambio de password es robusto (verifica password actual, valida nueva, mensajes claros).
2. Implementa 2FA real con Supabase Auth MFA (TOTP — apps tipo Google Authenticator / Authy / 1Password).

Si en el medio se complica, el 2FA puede mantener su estado "Próximamente" pulido — pero el password change tiene que estar 100% sólido.

**Tiempo estimado:** 2 horas (1h password + 1h 2FA).

## Contexto del proyecto

Mismo que prompts anteriores. **Supabase Auth MFA** está disponible (es feature core de Supabase). Doc: https://supabase.com/docs/guides/auth/auth-mfa.

**Reglas:** main directo, push tras commitear, no branches/worktrees.

## Tareas concretas

### 1. Robustecer el cambio de password (prompt 00 lo dejó funcional, este prompt lo afina)

`apps/dispatcher/src/components/admin/settings/settings-client.tsx`

Form fields: contraseña actual, nueva, confirmar nueva.

Schema Zod:

```ts
const ChangePasswordSchema = z.object({
  current: z.string().min(1, 'Ingresá tu contraseña actual'),
  next: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres')
    .regex(/[A-Z]/, 'Necesita al menos una mayúscula')
    .regex(/[0-9]/, 'Necesita al menos un número'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
}).refine((d) => d.next !== d.current, {
  message: 'La nueva contraseña debe ser diferente',
  path: ['next'],
});
```

Submit:

```ts
async function onSubmit(values) {
  // 1. Re-autenticar con la actual (verificación)
  const { error: authErr } = await sb.auth.signInWithPassword({
    email: user.email,
    password: values.current,
  });
  if (authErr) {
    setError('current', { message: 'Contraseña actual incorrecta' });
    return;
  }
  // 2. Update
  const { error: updErr } = await sb.auth.updateUser({ password: values.next });
  if (updErr) {
    toast.error(updErr.message);
    return;
  }
  toast.success('Contraseña actualizada');
  reset();
}
```

UX details:
- Inputs `type="password"` con toggle de visibilidad (icono `Eye` / `EyeOff` de lucide).
- Strength meter visual debajo del input "next" (rojo / amarillo / verde según largo + reglas).
- Botón submit deshabilitado mientras la validación falla.
- Después de éxito, limpiar el form y mostrar el toast.

### 2. Implementar 2FA TOTP

Usar Supabase Auth MFA. Doc: https://supabase.com/docs/guides/auth/auth-mfa#mfa-with-totp

Estados a manejar:
- **Estado 1**: No tiene 2FA → Switch off → click → abre dialog "Configurar 2FA".
- **Estado 2**: Setup en curso → muestra QR + input código.
- **Estado 3**: Tiene 2FA → Switch on → click → confirma con dialog "¿Querés desactivar 2FA?".

#### a. Verificar si el usuario tiene 2FA al cargar settings

```ts
const { data: factors } = await sb.auth.mfa.listFactors();
const totp = factors?.totp?.[0];
const hasTotp = totp?.status === 'verified';
setTwoFaEnabled(hasTotp);
```

#### b. Configurar 2FA — dialog con QR

Cuando el usuario activa el switch:

```ts
const { data: enroll, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
// enroll.totp.qr_code es un data URL — mostrarlo como <img>
// enroll.totp.secret es para mostrar texto plano alternativo
const factorId = enroll.id;
```

UI del dialog:
- Heading: "Configurar autenticación en dos pasos"
- Texto: "Escaneá el código QR con tu app (Google Authenticator, Authy, 1Password, etc)."
- `<img src={enroll.totp.qr_code} />` con tamaño 200x200.
- Detalles colapsable: "¿No podés escanear? Ingresá manualmente este código: <code>{enroll.totp.secret}</code>"
- Input numérico 6 dígitos: "Ingresá el código generado por tu app".
- Botones: Cancelar / Confirmar.

Cuando hace submit:

```ts
const { data: challenge } = await sb.auth.mfa.challenge({ factorId });
const { error: verifyErr } = await sb.auth.mfa.verify({
  factorId, challengeId: challenge.id, code,
});
if (verifyErr) {
  setError('Código incorrecto. Probá de nuevo.');
  return;
}
toast.success('2FA activada');
setTwoFaEnabled(true);
closeDialog();
```

#### c. Desactivar 2FA

Dialog de confirmación. Después:

```ts
const { error } = await sb.auth.mfa.unenroll({ factorId: totp.id });
if (error) { toast.error(error.message); return; }
toast.success('2FA desactivada');
setTwoFaEnabled(false);
```

#### d. Login flow con 2FA

Cuando un usuario con 2FA se loguea, después del `signInWithPassword` exitoso, Supabase devuelve un AAL (`aal1`). Para llegar a `aal2`, hay que hacer challenge + verify.

`apps/dispatcher/src/app/(auth)/login/page.tsx`:

Detectar AAL después del login:

```ts
const { data, error } = await sb.auth.signInWithPassword({ email, password });
if (error) { /* maneja como hoy */ return; }
// Después del login exitoso, chequear si necesita MFA
const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
if (aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
  // mostrar dialog para input del código TOTP
  setShowMfaChallenge(true);
  return;
}
// flujo normal
```

UI del dialog:
- Input 6 dígitos.
- "Ingresá el código de tu app de autenticación".
- Submit:

```ts
const { data: factors } = await sb.auth.mfa.listFactors();
const totp = factors.totp[0];
const { data: challenge } = await sb.auth.mfa.challenge({ factorId: totp.id });
const { error } = await sb.auth.mfa.verify({
  factorId: totp.id, challengeId: challenge.id, code,
});
if (error) { setError('Código incorrecto'); return; }
// Auth subió a aal2, ahora redirige según rol
```

### 3. Audit log

Cada cambio de password / activación o desactivación de 2FA debería loggear en `audit_log`:

```sql
INSERT INTO audit_log (entity, entity_id, action, actor_id, actor_role, diff)
VALUES ('profiles', $user_id, 'password_changed', $user_id, $role, '{}');
```

(Idem para `mfa_enabled` y `mfa_disabled`.) Esto puede ser una RPC nueva o un trigger; lo más simple es llamarlo desde el cliente después del éxito.

### 4. Rate limiting (mention)

Supabase ya tiene rate limit para password changes. No agregamos nada custom — dejamos un comentario:

```ts
// NOTE: Supabase rate-limits auth.updateUser({ password }) a nivel proyecto.
// Si querés limit más estricto, agregalo en una edge function.
```

### 5. Recovery codes (decisión)

Supabase Auth MFA TOTP **no genera recovery codes nativamente** (a abril 2026). Si el usuario pierde el dispositivo, el admin tiene que entrar al dashboard y unenrollar el factor manualmente.

Para el MVP del demo: dejar comentario en la UI: "Si perdés tu dispositivo, contactá al administrador del sistema." Este caveat es OK para demo.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual password change:
1. Logueate como admin.
2. `/admin/settings` → tab Cuenta → Cambiar contraseña.
3. Ingresá actual incorrecta → error en el campo.
4. Ingresá nueva con menos de 8 chars → error de validación.
5. Ingresá nueva == actual → error.
6. Confirmar mismatch → error.
7. Submit válido → toast éxito.
8. Logout → login con nueva password OK.

Manual 2FA:
1. Login con la nueva password.
2. `/admin/settings` → tab Seguridad → activar 2FA.
3. Dialog muestra QR. Escanear con Google Authenticator.
4. Ingresar código de la app → toast éxito.
5. Logout → login con password OK → dialog pide 6 dígitos.
6. Ingresar código inválido → error.
7. Ingresar código correcto → entra al admin.
8. `/admin/settings` → desactivar 2FA → confirm dialog → desactivado.
9. Logout / login → ya no pide 2FA.
10. `/admin/audit` → ver entries `password_changed`, `mfa_enabled`, `mfa_disabled`.

## Commit

```
feat(admin): cambio de password real + 2FA TOTP

- Settings → Cuenta: form con re-auth + Zod (8 chars + mayús + número)
  + strength meter + show/hide password
- Settings → Seguridad: 2FA TOTP con QR via supabase.auth.mfa.enroll
- Login: detección AAL y dialog de challenge para usuarios con 2FA
- Audit log: entries para password_changed, mfa_enabled, mfa_disabled
- Caveat documentado: recovery codes no nativos en Supabase MFA
```
