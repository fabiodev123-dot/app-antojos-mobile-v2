/**
 * Crea el super admin inicial + el tenant "antojos" en Supabase.
 *
 * USO:
 *   node scripts/create-super-admin.mjs
 *
 * Idempotente: si el user/tenant ya existe, no falla. Imprime el resultado.
 *
 * Variables que crea:
 *   - auth.users: admin@antojos.com (email_confirm = true, password = admin123)
 *   - public.super_admins: fila con id = user.id
 *   - public.tenants: tenant_antojos (slug = "antojos", status = "active", plan = "pro")
 *   - public.tenant_users: admin es miembro admin del tenant "antojos"
 *
 * ⚠️  DEV ONLY — el password "admin123" NO debe usarse en producción.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error('❌ Faltan env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DATABASE_URL');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin@antojos.com';
const ADMIN_PASSWORD = 'admin123';
const TENANT_ID = 'tenant_antojos';
const TENANT_SLUG = 'antojos';
const TENANT_NAME = 'Rotisería Antojos';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sql = postgres(DATABASE_URL, { prepare: false });

async function ensureUser() {
  console.log(`▶ Buscando/creando user ${ADMIN_EMAIL}…`);
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === ADMIN_EMAIL);

  if (existing) {
    console.log(`  ✓ User ya existe (id=${existing.id})`);
    // Resetear password para dev (idempotencia útil)
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ❌ Error actualizando password: ${error.message}`);
      throw error;
    }
    console.log(`  ✓ Password reseteado a "${ADMIN_PASSWORD}"`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'super_admin' },
  });
  if (error) {
    console.error(`  ❌ Error creando user: ${error.message}`);
    throw error;
  }
  console.log(`  ✓ User creado (id=${data.user.id})`);
  return data.user.id;
}

async function ensureSuperAdmin(userId) {
  console.log(`▶ Asegurando fila en super_admins…`);
  await sql`
    INSERT INTO public.super_admins (id, created_at)
    VALUES (${userId}, now())
    ON CONFLICT (id) DO NOTHING
  `;
  console.log(`  ✓ super_admins OK`);
}

async function ensureTenant() {
  console.log(`▶ Asegurando tenant "${TENANT_SLUG}"…`);
  const now = new Date().toISOString();
  await sql`
    INSERT INTO public.tenants (id, slug, name, status, plan, created_at, updated_at)
    VALUES (${TENANT_ID}, ${TENANT_SLUG}, ${TENANT_NAME}, 'active', 'pro', ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      plan = EXCLUDED.plan,
      updated_at = EXCLUDED.updated_at
  `;
  console.log(`  ✓ tenants OK`);
}

async function ensureTenantUser(userId) {
  console.log(`▶ Vinculando admin con tenant como 'admin'…`);
  const id = `tu_${userId.slice(0, 8)}_${TENANT_SLUG}`;
  const now = new Date().toISOString();
  await sql`
    INSERT INTO public.tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
    VALUES (${id}, ${TENANT_ID}, ${userId}, 'admin', ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = EXCLUDED.updated_at
  `;
  console.log(`  ✓ tenant_users OK`);
}

async function main() {
  try {
    const userId = await ensureUser();
    await ensureSuperAdmin(userId);
    await ensureTenant();
    await ensureTenantUser(userId);
    console.log('\n🎉 Listo. Credenciales del super admin:');
    console.log(`   email:    ${ADMIN_EMAIL}`);
    console.log(`   password: ${ADMIN_PASSWORD}`);
    console.log(`\n👉 Iniciá la app con: npm run dev`);
    console.log(`👉 Entrá a: http://localhost:3000/admin`);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
