/**
 * Limpia TODOS los fixtures de prueba de aislamiento.
 *
 * Borra:
 *  - usuarios: test_iso_sin_tenant@, test_iso_tenant_a@, test_iso_superadmin@
 *  - tenant:   tenant_test_iso (con su categoria, producto y cliente)
 *
 * Es destructivo sólo sobre los fixtures con prefijo `test_iso` / `tenant_test_iso`.
 *
 * Uso: node scripts/cleanup-iso-fixtures.mjs
 */
import { readFileSync } from "node:fs";

function loadEnv(path) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv(".env.local");

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAILS = [
  "test_iso_sin_tenant@antojos.test",
  "test_iso_tenant_a@antojos.test",
  "test_iso_superadmin@antojos.test",
];
const TEST_TENANT = "tenant_test_iso";

// ── 1. Usuarios de auth ─────────────────────────────────────────────────────
const list = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
if (list.ok) {
  const lj = await list.json();
  for (const email of TEST_EMAILS) {
    const u = (lj.users ?? []).find((x) => x.email === email);
    if (!u) {
      console.log(`usuario ${email}: no existe`);
      continue;
    }
    const del = await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, {
      method: "DELETE",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    console.log(`usuario ${email}: borrado (${del.status})`);
  }
} else {
  console.error("no se pudo listar usuarios:", list.status);
}

// ── 2. Filas de datos del tenant de prueba ─────────────────────────────────
const postgres = (await import("postgres")).default;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
try {
  // Orden por dependencia de FK.
  const tables = [
    "pedido_items",
    "pedidos",
    "movimientos_stock",
    "recetas",
    "productos",
    "categorias",
    "ingredientes",
    "clientes",
    "ventas_rapidas",
    "gastos",
    "cierres_diarios",
  ];
  for (const t of tables) {
    const r = await sql.unsafe(
      `DELETE FROM "${t}" WHERE tenant_id = $1 RETURNING id`,
      [TEST_TENANT],
    );
    if (r.length) console.log(`tabla ${t}: ${r.length} fila(s) borrada(s)`);
  }

  const users = await sql.unsafe(
    `DELETE FROM tenant_users WHERE tenant_id = $1 RETURNING user_id`,
    [TEST_TENANT],
  );
  if (users.length) console.log(`tenant_users: ${users.length} fila(s) borrada(s)`);

  const sa = await sql.unsafe(
    `DELETE FROM super_admins WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'test_iso_%') RETURNING id`,
  );
  if (sa.length) console.log(`super_admins: ${sa.length} fila(s) borrada(s)`);

  const ten = await sql.unsafe(
    `DELETE FROM tenants WHERE id = $1 RETURNING id`,
    [TEST_TENANT],
  );
  console.log(
    ten.length
      ? `tenant ${TEST_TENANT}: borrado`
      : `tenant ${TEST_TENANT}: no existía`,
  );

  // Verificación final
  const check = await sql.unsafe(
    `SELECT (SELECT count(*)::int FROM tenants WHERE id = $1) AS tenant,
            (SELECT count(*)::int FROM auth.users WHERE email LIKE 'test_iso_%') AS usuarios`,
    [TEST_TENANT],
  );
  console.log(`\nverificación: tenant=${check[0].tenant} usuarios_test=${check[0].usuarios}`);
} finally {
  await sql.end({ timeout: 5 });
}
