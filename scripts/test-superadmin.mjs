/**
 * Verifica que el super admin conserva acceso global tras el fix fail-closed.
 * Usa el super admin de PRUEBA (test_iso_superadmin@antojos.test).
 *
 * Uso: node scripts/test-superadmin.mjs
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
const PROJECT_REF = new URL(SB_URL).hostname.split(".")[0];
const PASSWORD = "TestIso123!pass";
const EMAIL = "test_iso_superadmin@antojos.test";

async function sbLogin(email) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}

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
  try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  return { status: res.status, body };
}

let failures = 0;
function check(label, cond, detail) {
  if (cond) console.log(`    PASS  ${label}`);
  else { failures++; console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`); }
}

console.log("=".repeat(78));
console.log("SUPER ADMIN: acceso global tras el fix fail-closed");
console.log("=".repeat(78));

const session = await sbLogin(EMAIL);
const cookie = ssrCookie(session);
console.log(`\napp_metadata = ${JSON.stringify(session.user?.app_metadata)}`);

console.log("\n[1] GET /api/db/productos (super admin, sin tenant_id)");
const p = await appGet("/api/db/productos", cookie);
console.log(`    status=${p.status}`);
if (Array.isArray(p.body)) {
  const tenants = [...new Set(p.body.map((r) => r.tenantId ?? r.tenant_id))];
  console.log(`    filas=${p.body.length}  tenants=${JSON.stringify(tenants)}`);
  check("el super admin ve los productos de todos los tenants", p.body.length >= 98, `filas=${p.body.length}`);
} else {
  check("el super admin ve los productos", false, JSON.stringify(p.body).slice(0, 150));
}

console.log("\n[2] GET /api/db/productos?tenant_id=tenant_test_iso (filtro explícito)");
const p2 = await appGet("/api/db/productos?tenant_id=tenant_test_iso", cookie);
console.log(`    status=${p2.status}  filas=${Array.isArray(p2.body) ? p2.body.length : "n/a"}`);
check("el filtro por tenant funciona para el super admin", p2.status === 200 && Array.isArray(p2.body) && p2.body.length === 1, `filas=${Array.isArray(p2.body) ? p2.body.length : "?"}`);

console.log("\n[3] GET /api/db/productos?id=prod_test_iso_1 (fila de tenant B)");
const p3 = await appGet("/api/db/productos?id=prod_test_iso_1", cookie);
console.log(`    status=${p3.status}  ${JSON.stringify(p3.body).slice(0, 120)}`);
check("el super admin puede leer una fila de cualquier tenant", p3.status === 200, `status=${p3.status}`);

console.log("\n[4] GET /api/debug/state (super admin, dev)");
const d = await appGet("/api/debug/state", cookie);
console.log(`    status=${d.status}`);
console.log(`    ${JSON.stringify(d.body).slice(0, 300)}`);
check("el endpoint de debug responde al super admin", d.status === 200, `status=${d.status}`);
check(
  "el payload NO expone filas de tenants",
  !JSON.stringify(d.body).includes("tenant_antojos") && !JSON.stringify(d.body).includes("prod_test_iso_1"),
  "apareció un identificador de tenant",
);

console.log("\n[5] GET /api/db/pedidos (super admin)");
const pe = await appGet("/api/db/pedidos", cookie);
console.log(`    status=${pe.status}  filas=${Array.isArray(pe.body) ? pe.body.length : "n/a"}`);
check("el super admin ve los pedidos", pe.status === 200, `status=${pe.status}`);

console.log(`\n${"=".repeat(78)}`);
console.log(failures === 0 ? "RESULTADO: TODAS LAS COMPROBACIONES PASARON" : `RESULTADO: ${failures} FALLAS`);
console.log("=".repeat(78));
process.exitCode = failures === 0 ? 0 : 1;
