#!/usr/bin/env node
// =============================================================================
// sync-env.mjs
// -----------------------------------------------------------------------------
// Lee `.env` (y `.env.staging` / `.env.production` si existen) en la raíz del
// monorepo y genera los archivos derivados que cada app necesita:
//
//   • packages/flutter-core/env/dev.json      (driver, passenger)
//   • packages/flutter-core/env/stg.json      (si existe .env.staging)
//   • packages/flutter-core/env/prd.json      (si existe .env.production)
//   • apps/web/.env.local                     (Next.js - web)
//   • apps/dispatcher/.env.local              (Next.js - dispatcher)
//
// Uso:
//   node scripts/sync-env.mjs              # genera todo lo posible
//   node scripts/sync-env.mjs --env dev    # genera solo dev
//   node scripts/sync-env.mjs --check      # valida sin escribir
// =============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const onlyEnv = args.includes('--env') ? args[args.indexOf('--env') + 1] : null;
const checkOnly = args.includes('--check');

// Variables requeridas para que las apps arranquen
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

// =============================================================================
// .env parser (sin dependencias)
// =============================================================================
function parseEnv(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf8');
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Quitar comillas envolventes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function validate(envName, vars) {
  const missing = REQUIRED.filter((k) => !vars[k] || vars[k].trim() === '');
  if (missing.length > 0) {
    console.error(
      `\n❌ [${envName}] Faltan variables requeridas: ${missing.join(', ')}`
    );
    console.error(`   Editá el archivo de origen y volvé a ejecutar.\n`);
    return false;
  }
  return true;
}

// =============================================================================
// Generadores por target
// =============================================================================
function writeJson(targetPath, vars, envTag) {
  const payload = {
    SUPABASE_URL: vars.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: vars.SUPABASE_ANON_KEY ?? '',
    GOOGLE_MAPS_API_KEY: vars.GOOGLE_MAPS_API_KEY ?? '',
    MP_PUBLIC_KEY: vars.MP_PUBLIC_KEY ?? '',
    SENTRY_DSN: vars.SENTRY_DSN ?? '',
    ENVIRONMENT: envTag,
  };
  const content = JSON.stringify(payload, null, 2) + '\n';
  if (checkOnly) return;
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, 'utf8');
}

function writeLocalProperties(targetPath, vars) {
  // Lee el archivo existente y actualiza/agrega GOOGLE_MAPS_API_KEY
  let content = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : '';
  const key = 'GOOGLE_MAPS_API_KEY';
  const value = vars.GOOGLE_MAPS_API_KEY ?? '';
  const newLine = `${key}=${value}`;
  if (content.includes(`${key}=`)) {
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), newLine);
  } else {
    content = content.trimEnd() + '\n' + newLine + '\n';
  }
  if (checkOnly) return;
  writeFileSync(targetPath, content, 'utf8');
}

function writeNextEnv(targetPath, vars) {
  const lines = [
    '# AUTO-GENERATED por scripts/sync-env.mjs — NO editar a mano.',
    '# Editar .env en la raíz del monorepo y correr `pnpm env:sync`.',
    '',
    `NEXT_PUBLIC_SUPABASE_URL=${vars.SUPABASE_URL ?? ''}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${vars.SUPABASE_ANON_KEY ?? ''}`,
  ];
  if (vars.SUPABASE_SERVICE_ROLE_KEY) {
    lines.push(`SUPABASE_SERVICE_ROLE_KEY=${vars.SUPABASE_SERVICE_ROLE_KEY}`);
  }
  if (vars.SENTRY_DSN) {
    lines.push(`NEXT_PUBLIC_SENTRY_DSN=${vars.SENTRY_DSN}`);
  }
  const content = lines.join('\n') + '\n';
  if (checkOnly) return;
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, 'utf8');
}

// =============================================================================
// Pipeline
// =============================================================================
const envFiles = {
  dev: [join(ROOT, '.env'), join(ROOT, '.env.local')],
  stg: [join(ROOT, '.env.staging')],
  prd: [join(ROOT, '.env.production')],
};

function loadEnv(envName) {
  const sources = envFiles[envName];
  let merged = null;
  for (const src of sources) {
    const vars = parseEnv(src);
    if (vars) merged = { ...(merged ?? {}), ...vars };
  }
  return merged;
}

const targets = onlyEnv ? [onlyEnv] : ['dev', 'stg', 'prd'];

let anyGenerated = false;
let anyError = false;

console.log(`\n🔧 sync-env (${checkOnly ? 'check' : 'write'}) — root: ${ROOT}\n`);

for (const envName of targets) {
  const vars = loadEnv(envName);
  if (!vars) {
    if (envName === 'dev') {
      console.error(`❌ No se encontró .env en la raíz.`);
      console.error(`   Copiá .env.example → .env y completá los valores.\n`);
      anyError = true;
    } else {
      // staging/prod opcionales
      console.log(`⏭  [${envName}] sin archivo (.env.${envName === 'stg' ? 'staging' : 'production'}) — skip.`);
    }
    continue;
  }

  if (!validate(envName, vars)) {
    anyError = true;
    continue;
  }

  // Flutter JSON (paquete compartido — usado por driver)
  const jsonPath = join(ROOT, 'packages/flutter-core/env', `${envName}.json`);
  writeJson(jsonPath, vars, envName);
  console.log(`✅ [${envName}] ${jsonPath.replace(ROOT, '.')}`);

  // Flutter passenger (tiene su propio env/ por ahora)
  if (envName === 'dev') {
    const passengerJsonPath = join(ROOT, 'apps/passenger/env', `${envName}.json`);
    writeJson(passengerJsonPath, vars, envName);
    console.log(`✅ [${envName}] ${passengerJsonPath.replace(ROOT, '.')}`);
  }

  // Android local.properties (para manifestPlaceholders en build.gradle.kts)
  if (envName === 'dev') {
    for (const app of ['driver', 'passenger']) {
      const localPropsPath = join(ROOT, 'apps', app, 'android/local.properties');
      writeLocalProperties(localPropsPath, vars);
      console.log(`✅ [${envName}] ${localPropsPath.replace(ROOT, '.')} (GOOGLE_MAPS_API_KEY)`);
    }
  }

  // Next.js apps (solo para 'dev' por defecto; cambiar manualmente para deploy)
  if (envName === 'dev') {
    for (const app of ['web', 'dispatcher']) {
      const nextPath = join(ROOT, 'apps', app, '.env.local');
      writeNextEnv(nextPath, vars);
      console.log(`✅ [${envName}] ${nextPath.replace(ROOT, '.')}`);
    }
  }

  anyGenerated = true;
}

if (anyError) {
  process.exit(1);
}

if (!anyGenerated && !checkOnly) {
  console.log('\nℹ  Nada que generar. ¿Falta crear .env?\n');
  process.exit(1);
}

console.log(checkOnly ? '\n✅ check OK\n' : '\n✅ sync-env listo\n');
