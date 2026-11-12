/**
 * Crea usuarios de prueba para el test de aislamiento:
 *  - test_iso_sin_tenant@antojos.test  → sin tenant (superficie V4)
 *  - test_iso_tenant_a@antojos.test    → con tenant_antojos (control grupo)
 *
 * Uso: node scripts/create-iso-user.mjs
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

const USERS = [
  { email: "test_iso_sin_tenant@antojos.test", app_metadata: { provider: "email", providers: ["email"] } },
  { email: "test_iso_tenant_a@antojos.test", app_metadata: { provider: "email", providers: ["email"], tenant_id: "tenant_antojos" } },
];

async function create(u) {
  // Idempotente: si ya existe, lo borramos primero (por email, vía list+filter).
  const list = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (list.ok) {
    const lj = await list.json();
    const existing = (lj.users ?? []).find((x) => x.email === u.email);
    if (existing) {
      const del = await fetch(`${URL_BASE}/auth/v1/admin/users/${existing.id}`, {
        method: "DELETE",
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      });
      console.log(`  (borrado previo ${u.email}: ${del.status})`);
    }
  }

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

async function login(email) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}

for (const u of USERS) {
  const created = await create(u);
  console.log(`CREATED ${u.email} id=${created.id} app_metadata=${JSON.stringify(created.app_metadata)}`);
  const lj = await login(u.email);
  console.log(`  LOGIN OK -> jwt tenant_id=${lj.user?.app_metadata?.tenant_id ?? "(NINGUNO)"}`);
}
console.log(`\nPassword de ambos: ${PASSWORD}`);
