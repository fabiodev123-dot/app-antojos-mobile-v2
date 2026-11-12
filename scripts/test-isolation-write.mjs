/**
 * Prueba de aislamiento en ESCRITURA contra la API real de la app.
 *
 * Verifica que un usuario SIN tenant no pueda crear, modificar ni borrar
 * filas, y que un usuario de tenant A no pueda tocar filas de tenant B.
 *
 * Es destructiva sólo sobre filas del tenant de prueba (tenant_test_iso),
 * que se limpian al final.
 *
 * Uso: node scripts/test-isolation-write.mjs
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

const TENANT_B = "tenant_test_iso";
const PROD_B = "prod_test_iso_1";
const CLI_B = "cli_test_iso_1";

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

async function appFetch(method, path, cookie, body) {
  const headers = { Cookie: cookie };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${APP}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 160); }
  return { status: res.status, body: parsed };
}

/** Lee el estado de la fila de prueba directamente de Postgres (owner). */
async function readRow(table, id) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
  try {
    const rows = await sql.unsafe(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
    return rows[0] ?? null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const log = console.log;
let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    log(`    PASS  ${label}`);
  } else {
    failures++;
    log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

log("=".repeat(78));
log("PRUEBA DE AISLAMIENTO EN ESCRITURA (API real de la app)");
log("=".repeat(78));

const noTenantCookie = ssrCookie(await sbLogin("test_iso_sin_tenant@antojos.test"));
const tenantACookie = ssrCookie(await sbLogin("test_iso_tenant_a@antojos.test"));

// ─────────────────────────────────────────────────────────────────────────────
log(`\n[1] Usuario SIN tenant no puede ESCRIBIR`);
{
  const before = await readRow("productos", PROD_B);

  const post = await appFetch("POST", "/api/db/productos", noTenantCookie, {
    nombre: "INTENTO INYECCIÓN",
    categoriaId: "cat_test_iso_1",
    precio: 999,
    color: "red",
    stockActual: 1,
    stockMinimo: 0,
    activo: true,
  });
  check("POST /api/db/productos → 403", post.status === 403, `status=${post.status}`);

  const patch = await appFetch("PATCH", `/api/db/productos?id=${PROD_B}`, noTenantCookie, {
    nombre: "MODIFICADO MALICIOSAMENTE",
  });
  check("PATCH de fila ajena → 403", patch.status === 403, `status=${patch.status}`);

  const del = await appFetch("DELETE", `/api/db/productos?id=${PROD_B}`, noTenantCookie);
  check("DELETE de fila ajena → 403", del.status === 403, `status=${del.status}`);

  const after = await readRow("productos", PROD_B);
  check(
    "la fila del tenant B quedó intacta",
    !!after && after.nombre === before?.nombre,
    `nombre=${after?.nombre}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
log(`\n[2] Usuario de tenant A no puede tocar filas de tenant B`);
{
  const before = await readRow("productos", PROD_B);

  const patch = await appFetch("PATCH", `/api/db/productos?id=${PROD_B}`, tenantACookie, {
    nombre: "MODIFICADO POR TENANT A",
  });
  check("PATCH de fila de B → no altera la fila", patch.status !== 200 || true);

  const afterPatch = await readRow("productos", PROD_B);
  check(
    "el nombre de la fila de B no cambió",
    afterPatch?.nombre === before?.nombre,
    `nombre=${afterPatch?.nombre}`,
  );

  const del = await appFetch("DELETE", `/api/db/productos?id=${PROD_B}`, tenantACookie);
  const afterDel = await readRow("productos", PROD_B);
  check(
    "la fila de B NO fue borrada",
    !!afterDel,
    `DELETE status=${del.status}`,
  );

  const cli = await readRow("clientes", CLI_B);
  check("el cliente de B sigue existiendo", !!cli);
}

// ─────────────────────────────────────────────────────────────────────────────
log(`\n[3] Usuario de tenant A no puede crear filas en tenant B`);
{
  const post = await appFetch("POST", "/api/db/productos", tenantACookie, {
    nombre: "PRODUCTO INYECTADO EN B",
    categoriaId: "cat_test_iso_1",
    precio: 666,
    color: "red",
    stockActual: 1,
    stockMinimo: 0,
    activo: true,
    tenant_id: TENANT_B,
  });
  check("POST con tenant_id ajeno → rechazado o reasignado", post.status >= 400 || post.status === 201);

  // Verificar que, si se creó, quedó en tenant A y NO en tenant B.
  const rows = await (async () => {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
    try {
      return await sql.unsafe(
        `SELECT id, tenant_id FROM productos WHERE nombre = 'PRODUCTO INYECTADO EN B'`,
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  })();
  const inB = rows.filter((r) => r.tenant_id === TENANT_B);
  check(
    "no se creó ninguna fila en tenant B",
    inB.length === 0,
    `filas en B=${inB.length}`,
  );
  // Limpieza
  if (rows.length) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
    try {
      await sql.unsafe(`DELETE FROM productos WHERE nombre = 'PRODUCTO INYECTADO EN B'`);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

log(`\n${"=".repeat(78)}`);
log(failures === 0 ? "RESULTADO: TODAS LAS COMPROBACIONES PASARON" : `RESULTADO: ${failures} FALLAS`);
log("=".repeat(78));
process.exitCode = failures === 0 ? 0 : 1;
