/**
 * Prueba de aislamiento cross-tenant (lectura via API REST = rol `authenticated`).
 * Read-only: solo SELECTs via PostgREST.
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
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function login(email, password) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(j)}`);
  return { token: j.access_token, meta: j.user?.app_metadata };
}

async function rest(path, token, extraHeaders = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, ...extraHeaders },
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}

const line = (s) => console.log(s);
line("=".repeat(78));
line("PRUEBA DE AISLAMIENTO CROSS-TENANT (PostgREST, rol `authenticated`)");
line("=".repeat(78));

// ── 1. Usuario SIN tenant ────────────────────────────────────────────────────
line("\n[1] Login como usuario SIN tenant (test_iso_sin_tenant@antojos.test)");
const noTenant = await login("test_iso_sin_tenant@antojos.test", "TestIso123!pass");
line(`    app_metadata = ${JSON.stringify(noTenant.meta)}`);
line(`    tenant_id en JWT = ${noTenant.meta?.tenant_id ?? "(NINGUNO)"}`);

line("\n[2] GET /productos como usuario SIN tenant");
const p1 = await rest("productos?select=id,nombre,tenant_id&limit=100", noTenant.token);
line(`    status=${p1.status}  filas=${Array.isArray(p1.body) ? p1.body.length : "n/a"}`);
if (Array.isArray(p1.body)) {
  const tenants = [...new Set(p1.body.map((r) => r.tenant_id))];
  line(`    tenants visibles = ${JSON.stringify(tenants)}`);
  line(`    >>> ${tenants.length > 1 ? "FUGA CONFIRMADA: ve datos de multiples tenants" : "OK: solo 1 tenant"}`);
  if (p1.body.length > 0) line(`    ejemplo: ${JSON.stringify(p1.body[0])}`);
}

line("\n[3] GET /productos?id=prod_test_iso_1 (fila del tenant de prueba)");
const p2 = await rest("productos?id=eq.prod_test_iso_1&select=id,nombre,tenant_id", noTenant.token);
line(`    status=${p2.status}  body=${JSON.stringify(p2.body)}`);

line("\n[4] GET /clientes como usuario SIN tenant");
const c1 = await rest("clientes?select=id,nombre,tenant_id&limit=100", noTenant.token);
line(`    status=${c1.status}  filas=${Array.isArray(c1.body) ? c1.body.length : "n/a"}`);
if (Array.isArray(c1.body)) {
  const tenants = [...new Set(c1.body.map((r) => r.tenant_id))];
  line(`    tenants visibles = ${JSON.stringify(tenants)}`);
}

line("\n[5] GET /pedidos como usuario SIN tenant");
const d1 = await rest("pedidos?select=id,numero,tenant_id&limit=100", noTenant.token);
line(`    status=${d1.status}  filas=${Array.isArray(d1.body) ? d1.body.length : "n/a"}`);
if (Array.isArray(d1.body)) {
  line(`    tenants visibles = ${JSON.stringify([...new Set(d1.body.map((r) => r.tenant_id))])}`);
}

// ── 2. Usuario CON tenant (grupo de control) ────────────────────────────────
line("\n[6] Login como tenant_user CON tenant (rayin123@admin.com)");
let withTenant = null;
try {
  withTenant = await login("rayin123@admin.com", "TestIso123!pass");
  line(`    app_metadata = ${JSON.stringify(withTenant.meta)}`);
  const p3 = await rest("productos?select=id,nombre,tenant_id&limit=200", withTenant.token);
  line(`    GET /productos -> status=${p3.status} filas=${Array.isArray(p3.body) ? p3.body.length : "n/a"}`);
  if (Array.isArray(p3.body)) {
    line(`    tenants visibles = ${JSON.stringify([...new Set(p3.body.map((r) => r.tenant_id))])}`);
  }
  const p4 = await rest("productos?id=eq.prod_test_iso_1&select=id,nombre,tenant_id", withTenant.token);
  line(`    GET /productos?id=prod_test_iso_1 -> status=${p4.status} body=${JSON.stringify(p4.body)}`);
} catch (e) {
  line(`    (no se pudo autenticar: ${e.message})`);
}

line("\n" + "=".repeat(78));
