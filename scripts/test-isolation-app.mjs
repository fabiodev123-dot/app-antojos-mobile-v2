/**
 * Prueba de aislamiento contra la API REAL de la app (Next.js en localhost).
 *
 * La app conecta a Postgres con el rol `postgres` (bypasea RLS), asi que
 * este test mide si el FILTRADO EN CODIGO DE APLICACION aguanta.
 *
 * Construye la cookie de sesion de @supabase/ssr a partir del token de
 * login de Supabase y llama a /api/db/* como cada usuario.
 *
 * Uso: node scripts/test-isolation-app.mjs
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

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = "TestIso123!pass";
const PROJECT_REF = new URL(SB_URL).hostname.split(".")[0];

async function sbLogin(email) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`sb login ${email}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}

/** Cookie de sesion que @supabase/ssr espera: `base64-<base64url(JSON)>`. */
function ssrCookie(session) {
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  };
  const enc = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `sb-${PROJECT_REF}-auth-token=base64-${enc}`;
}

async function appGet(path, cookie) {
  const res = await fetch(`${APP}${path}`, { headers: { Cookie: cookie } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 160); }
  return { status: res.status, body };
}

const log = console.log;
log("=".repeat(78));
log("AISLAMIENTO CONTRA LA API REAL DE LA APP (localhost:3000)");
log("=".repeat(78));

const USERS = [
  ["test_iso_tenant_a@antojos.test", "tenant_antojos (control)"],
  ["test_iso_sin_tenant@antojos.test", "SIN tenant (superficie V4)"],
];

for (const [email, label] of USERS) {
  log(`\n${"─".repeat(78)}`);
  log(`USUARIO: ${email}  —  ${label}`);
  log(`${"─".repeat(78)}`);

  const session = await sbLogin(email);
  const cookie = ssrCookie(session);
  const tenant = session.user?.app_metadata?.tenant_id ?? "(NINGUNO)";
  log(`JWT tenant_id: ${tenant}`);

  // 1. Listar productos
  log("\n  GET /api/db/productos");
  const p = await appGet("/api/db/productos", cookie);
  const rows = Array.isArray(p.body) ? p.body : null;
  log(`    status=${p.status}`);
  if (rows) {
    const tenants = [...new Set(rows.map((r) => r.tenant_id))];
    log(`    filas=${rows.length}  tenants visibles=${JSON.stringify(tenants)}`);
    const otros = rows.filter((r) => r.tenant_id !== tenant);
    log(`    >>> ${otros.length > 0 ? `FUGA: ${otros.length} filas de OTRO tenant` : "OK: solo filas propias"}`);
  } else {
    log(`    body=${JSON.stringify(p.body).slice(0, 200)}`);
  }

  // 2. Pedir una fila del tenant de prueba por id
  log("\n  GET /api/db/productos?id=prod_test_iso_1   (fila de tenant_test_iso)");
  const t = await appGet("/api/db/productos?id=prod_test_iso_1", cookie);
  log(`    status=${t.status}  body=${JSON.stringify(t.body).slice(0, 200)}`);

  // 3. Clientes
  log("\n  GET /api/db/clientes");
  const c = await appGet("/api/db/clientes", cookie);
  if (Array.isArray(c.body)) {
    const tenants = [...new Set(c.body.map((r) => r.tenant_id))];
    log(`    status=${c.status} filas=${c.body.length} tenants=${JSON.stringify(tenants)}`);
  } else {
    log(`    status=${c.status} body=${JSON.stringify(c.body).slice(0, 200)}`);
  }

  // 4. Pedidos
  log("\n  GET /api/db/pedidos");
  const d = await appGet("/api/db/pedidos", cookie);
  if (Array.isArray(d.body)) {
    const tenants = [...new Set(d.body.map((r) => r.tenant_id))];
    log(`    status=${d.status} filas=${d.body.length} tenants=${JSON.stringify(tenants)}`);
  } else {
    log(`    status=${d.status} body=${JSON.stringify(d.body).slice(0, 200)}`);
  }
}

log(`\n${"=".repeat(78)}`);
