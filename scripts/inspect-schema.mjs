/**
 * Script de diagnóstico READ-ONLY contra la base de Supabase.
 * NO escribe nada. Solo SELECT de metadatos.
 *
 * Uso: node scripts/inspect-schema.mjs
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

function loadEnv(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv(".env.local");

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  prepare: false,
});

try {
  console.log("=== 1. COLUMNAS DE super_admins / tenant_users / tenants ===");
  const cols = await sql`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('super_admins','tenant_users','tenants')
    ORDER BY table_name, ordinal_position
  `;
  for (const c of cols) {
    console.log(`  ${c.table_name}.${c.column_name} ${c.data_type} nullable=${c.is_nullable}`);
  }

  console.log("\n=== 2. RLS POR TABLA (public) ===");
  const rls = await sql`
    SELECT c.relname AS table, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `;
  for (const t of rls) {
    console.log(`  ${t.table.padEnd(24)} rls=${t.rls_enabled}`);
  }

  console.log("\n=== 3. POLICIES ===");
  const pol = await sql`
    SELECT tablename, policyname, cmd, roles::text, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `;
  for (const p of pol) {
    console.log(`  ${p.tablename}.${p.policyname} cmd=${p.cmd} roles=${p.roles}`);
    console.log(`      using=${p.qual ?? "(null)"}`);
    if (p.with_check) console.log(`      check=${p.with_check}`);
  }

  console.log("\n=== 4. TENANTS REALES (solo conteo y shape) ===");
  const t = await sql`SELECT count(*)::int AS n FROM tenants`;
  console.log(`  tenants: ${t[0].n}`);
  const tu = await sql`SELECT count(*)::int AS n FROM tenant_users`;
  console.log(`  tenant_users: ${tu[0].n}`);
  const sa = await sql`SELECT count(*)::int AS n FROM super_admins`;
  console.log(`  super_admins: ${sa[0].n}`);

  console.log("\n=== 5. TENANTS SIN tenant_id EN TABLAS DE DOMINIO ===");
  const domainTables = [
    "categorias","productos","ingredientes","recetas","ventas_rapidas",
    "clientes","pedidos","pedido_items","movimientos_stock","gastos","cierres_diarios",
  ];
  for (const table of domainTables) {
    try {
      const r = await sql.unsafe(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE tenant_id IS NULL)::int AS sin_tenant FROM "${table}"`,
      );
      console.log(`  ${table.padEnd(20)} total=${r[0].total} sin_tenant_id=${r[0].sin_tenant}`);
    } catch (e) {
      console.log(`  ${table.padEnd(20)} ERROR: ${e.message}`);
    }
  }

  console.log("\n=== 6. USUARIOS EN auth.users vs tenant_users ===");
  const au = await sql`SELECT count(*)::int AS n FROM auth.users`;
  console.log(`  auth.users: ${au[0].n}`);
  const orphan = await sql`
    SELECT count(*)::int AS n
    FROM tenant_users tu
    LEFT JOIN auth.users u ON u.id = tu.user_id
    WHERE u.id IS NULL
  `;
  console.log(`  tenant_users sin auth.user: ${orphan[0].n}`);
  const noTenant = await sql`
    SELECT count(*)::int AS n
    FROM auth.users u
    LEFT JOIN tenant_users tu ON tu.user_id = u.id
    LEFT JOIN super_admins sa ON sa.id = u.id
    WHERE tu.user_id IS NULL AND sa.id IS NULL
  `;
  console.log(`  auth.users SIN tenant NI super_admin (posible fuga V4): ${noTenant[0].n}`);

  console.log("\n=== 7. app_metadata.tenant_id presente? ===");
  const md = await sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE raw_app_meta_data ? 'tenant_id')::int AS con_tenant
    FROM auth.users
  `;
  console.log(`  auth.users total=${md[0].total} con app_metadata.tenant_id=${md[0].con_tenant}`);

  console.log("\n=== 8. ROLES DE POSTGRES ===");
  const roles = await sql`
    SELECT current_user AS usr, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
  `;
  console.log(`  current_user=${roles[0].usr} super=${roles[0].rolsuper} bypassrls=${roles[0].rolbypassrls}`);
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
