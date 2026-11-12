/**
 * Crea (o recrea) los fixtures de prueba de aislamiento.
 *
 * Deja en la base:
 *   - tenant:  tenant_test_iso  (con 1 categoria, 1 producto, 1 cliente)
 *   - usuarios:
 *       test_iso_tenant_a@antojos.test     → con tenant_antojos en el JWT
 *       test_iso_sin_tenant@antojos.test   → sin tenant en ningún lado
 *       test_iso_superadmin@antojos.test  → super admin, sin tenant
 *
 * Es idempotente: se puede correr las veces que haga falta.
 *
 * Uso: node scripts/setup-iso-fixtures.mjs
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
const PASSWORD = "TestIso123!pass";
const TENANT_TEST = "tenant_test_iso";

const USERS = [
  {
    email: "test_iso_sin_tenant@antojos.test",
    app_metadata: { provider: "email", providers: ["email"] },
    superAdmin: false,
  },
  {
    email: "test_iso_tenant_a@antojos.test",
    app_metadata: { provider: "email", providers: ["email"], tenant_id: "tenant_antojos" },
    superAdmin: false,
  },
  {
    email: "test_iso_superadmin@antojos.test",
    app_metadata: { provider: "email", providers: ["email"] },
    superAdmin: true,
  },
];

// ── 1. Usuarios vía la API admin de Supabase ────────────────────────────────
async function deleteUser(email) {
  const list = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (!list.ok) return null;
  const lj = await list.json();
  const found = (lj.users ?? []).find((x) => x.email === email);
  if (!found) return null;
  await fetch(`${URL_BASE}/auth/v1/admin/users/${found.id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  return found.id;
}

async function createUser(u) {
  await deleteUser(u.email);
  const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: u.app_metadata,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`create ${u.email}: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

const created = [];
for (const u of USERS) {
  const user = await createUser(u);
  created.push({ ...u, id: user.id });
  console.log(`usuario ${u.email} → ${user.id}`);
}

// ── 2. Datos del tenant de prueba ──────────────────────────────────────────
const postgres = (await import("postgres")).default;
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});

try {
  await sql.begin(async (tx) => {
    // Limpieza previa por si quedó algo de una corrida anterior.
    await tx`DELETE FROM pedido_items WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM pedidos WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM movimientos_stock WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM recetas WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM productos WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM categorias WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM ingredientes WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM clientes WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM ventas_rapidas WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM gastos WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM cierres_diarios WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM tenant_users WHERE tenant_id = ${TENANT_TEST}`;
    await tx`DELETE FROM super_admins WHERE user_id = ANY(${sql.array(created.map((c) => c.id))}::uuid[])`;

    await tx`
      INSERT INTO tenants (id, slug, name, status, plan)
      VALUES (${TENANT_TEST}, 'test-iso', 'TEST AISLAMIENTO (BORRAR)', 'trial', 'free')
      ON CONFLICT (id) DO NOTHING
    `;

    await tx`
      INSERT INTO categorias (id, nombre, color_default, activo, tenant_id, created_at, updated_at)
      VALUES ('cat_test_iso_1', 'CAT AISLAMIENTO BORRAR', 'red', true, ${TENANT_TEST}, now(), now())
    `;

    await tx`
      INSERT INTO productos (id, nombre, categoria_id, precio, color, stock_actual, stock_minimo, activo, tenant_id, created_at, updated_at)
      VALUES ('prod_test_iso_1', 'PRODUCTO AISLAMIENTO BORRAR', 'cat_test_iso_1', 111, 'red', 99, 1, true, ${TENANT_TEST}, now(), now())
    `;

    await tx`
      INSERT INTO clientes (id, nombre, telefono, total_pedidos, tenant_id, created_at, updated_at)
      VALUES ('cli_test_iso_1', 'CLIENTE AISLAMIENTO BORRAR', '0000000000', 7, ${TENANT_TEST}, now(), now())
    `;

    // El super admin de prueba.
    const sa = created.find((c) => c.superAdmin);
    if (sa) {
      await tx`
        INSERT INTO super_admins (id, user_id) VALUES (${sa.id}, ${sa.id})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });

  console.log(`tenant ${TENANT_TEST}: creado con 1 categoria, 1 producto, 1 cliente`);

  // ── 3. Verificación ───────────────────────────────────────────────────────
  const check = await sql`
    SELECT
      (SELECT count(*)::int FROM tenants WHERE id = ${TENANT_TEST}) AS tenant,
      (SELECT count(*)::int FROM productos WHERE tenant_id = ${TENANT_TEST}) AS productos,
      (SELECT count(*)::int FROM super_admins WHERE user_id = ANY(${sql.array(created.map((c) => c.id))}::uuid[])) AS super_admins,
      (SELECT count(*)::int FROM auth.users WHERE email LIKE 'test_iso_%') AS usuarios
  `;
  console.log(
    `\nverificación: tenant=${check[0].tenant} productos=${check[0].productos} ` +
      `super_admins=${check[0].super_admins} usuarios_test=${check[0].usuarios}`,
  );
  console.log(`password de los usuarios de prueba: ${PASSWORD}`);
} finally {
  await sql.end({ timeout: 5 });
}
