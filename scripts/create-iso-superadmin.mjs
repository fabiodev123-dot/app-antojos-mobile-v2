/**
 * Crea un super admin de PRUEBA para verificar que el panel /admin sigue
 * funcionando después del fix fail-closed. No toca el super admin real.
 *
 * Uso: node scripts/create-iso-superadmin.mjs
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
const EMAIL = "test_iso_superadmin@antojos.test";
const PASSWORD = "TestIso123!pass";

// Limpiar si ya existe
const list = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
if (list.ok) {
  const lj = await list.json();
  const existing = (lj.users ?? []).find((x) => x.email === EMAIL);
  if (existing) {
    await fetch(`${URL_BASE}/auth/v1/admin/users/${existing.id}`, {
      method: "DELETE",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    console.log(`borrado previo: ${EMAIL}`);
  }
}

const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
  method: "POST",
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { provider: "email", providers: ["email"] },
  }),
});
const body = await res.json();
if (!res.ok) {
  console.error("CREATE falló:", res.status, JSON.stringify(body));
  process.exit(1);
}
console.log(`CREADO ${EMAIL} id=${body.id}`);

// Registrar en super_admins (id = auth user id, según el schema real)
const postgres = (await import("postgres")).default;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
try {
  await sql.unsafe(
    `INSERT INTO super_admins (id, user_id) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [body.id, body.id],
  );
  console.log("Registrado en super_admins");
} finally {
  await sql.end({ timeout: 5 });
}

// Verificar login
const login = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const lj = await login.json();
console.log("LOGIN:", login.status, lj.access_token ? "OK" : JSON.stringify(lj));
console.log("jwt app_metadata:", JSON.stringify(lj.user?.app_metadata));
