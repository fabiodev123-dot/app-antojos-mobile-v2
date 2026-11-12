/**
 * Prueba L4: el rol restringido (sin BYPASSRLS) debe quedar subjecto a RLS.
 *
 * Se conecta con el rol `antojos_app` (NO bypassrls) y verifica:
 *  1. Con GUC app.tenant_id seteado → ve sólo las filas de ese tenant.
 *  2. Sin GUC → ve 0 filas (fail closed).
 *  3. Con GUC de otro tenant → no ve filas ajenas.
 *
 * Uso: node scripts/test-rls-role.mjs
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

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

const APP_ROLE_PASSWORD = process.env.APP_ROLE_PASSWORD;
if (!APP_ROLE_PASSWORD) {
  console.error("Falta APP_ROLE_PASSWORD (password del rol antojos_app).");
  process.exit(1);
}

const PROJECT_REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const APP_ROLE_USER = `antojos_app.${PROJECT_REF}`;
const POOLER_HOST = process.env.POOLER_HOST ?? "aws-0-us-west-2.pooler.supabase.com";
const POOLER_PORT = process.env.POOLER_PORT ?? "6543";

const restrictedUrl = `postgresql://${APP_ROLE_USER}:${encodeURIComponent(APP_ROLE_PASSWORD)}@${POOLER_HOST}:${POOLER_PORT}/postgres`;

const sql = postgres(restrictedUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});

let failures = 0;
function check(label, cond, detail) {
  if (cond) console.log(`    PASS  ${label}`);
  else {
    failures++;
    console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("=".repeat(78));
console.log("L4 — RLS con rol restringido (antojos_app, sin BYPASSRLS)");
console.log("=".repeat(78));

try {
  const who = await sql`SELECT current_user AS u, session_user AS s`;
  console.log(`\nconectado como: ${who[0].u}`);

  const perms = await sql`
    SELECT has_table_privilege(current_user, 'productos', 'SELECT') AS sel,
           has_table_privilege(current_user, 'productos', 'INSERT') AS ins,
           has_table_privilege(current_user, 'tenants', 'SELECT') AS ten
  `;
  check("tiene SELECT en productos", perms[0].sel);
  check("tiene INSERT en productos", perms[0].ins);
  check("tiene SELECT en tenants", perms[0].ten);

  // ── 1. Con GUC seteado ────────────────────────────────────────────────────
  console.log("\n[1] SET LOCAL app.tenant_id = 'tenant_antojos'");
  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', 'tenant_antojos', true)`;
    const rows = await tx`SELECT count(*)::int AS n, count(DISTINCT tenant_id)::int AS tenants FROM productos`;
    const b = await tx`SELECT count(*)::int AS n FROM productos WHERE tenant_id = 'tenant_test_iso'`;
    console.log(`    filas=${rows[0].n}  tenants_distintos=${rows[0].tenants}  filas_de_B=${b[0].n}`);
    check("ve sólo filas de su tenant", rows[0].n === 97 && rows[0].tenants === 1, `filas=${rows[0].n}`);
    check("NO ve filas del tenant B", b[0].n === 0, `filas_B=${b[0].n}`);
  });

  // ── 2. Sin GUC ────────────────────────────────────────────────────────────
  console.log("\n[2] Sin GUC seteado (fail closed)");
  await sql.begin(async (tx) => {
    const rows = await tx`SELECT count(*)::int AS n FROM productos`;
    console.log(`    filas=${rows[0].n}`);
    check("ve 0 filas (fail closed)", rows[0].n === 0, `filas=${rows[0].n}`);
  });

  // ── 3. GUC con sentinel __none__ ─────────────────────────────────────────
  console.log("\n[3] GUC = '__none__' (sin tenant de sesion)");
  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', '__none__', true)`;
    const rows = await tx`SELECT count(*)::int AS n FROM productos`;
    console.log(`    filas=${rows[0].n}`);
    check("ve 0 filas (fail closed)", rows[0].n === 0, `filas=${rows[0].n}`);
  });

  // ── 4. GUC del tenant B ──────────────────────────────────────────────────
  console.log("\n[4] SET LOCAL app.tenant_id = 'tenant_test_iso'");
  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', 'tenant_test_iso', true)`;
    const rows = await tx`SELECT count(*)::int AS n FROM productos`;
    const a = await tx`SELECT count(*)::int AS n FROM productos WHERE tenant_id = 'tenant_antojos'`;
    console.log(`    filas=${rows[0].n}  filas_de_A=${a[0].n}`);
    check("ve sólo las filas del tenant B", rows[0].n === 1, `filas=${rows[0].n}`);
    check("NO ve filas del tenant A", a[0].n === 0, `filas_A=${a[0].n}`);
  });

  // ── 5. Escrituras bloqueadas fuera del tenant ────────────────────────────
  console.log("\n[5] INSERT con tenant ajeno debe fallar (WITH CHECK)");
  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', 'tenant_antojos', true)`;
    let blocked = false;
    try {
      await tx`
        INSERT INTO productos (id, nombre, categoria_id, precio, color, stock_actual, stock_minimo, activo, tenant_id, created_at, updated_at)
        VALUES ('prod_rls_intento', 'INTENTO RLS', 'cat_test_iso_1', 1, 'red', 0, 0, true, 'tenant_test_iso', now(), now())
      `;
    } catch (e) {
      blocked = true;
      console.log(`    bloqueado: ${String(e.message).slice(0, 90)}`);
    }
    check("el INSERT en otro tenant fue rechazado", blocked);
    const check2 = await tx`SELECT count(*)::int AS n FROM productos WHERE id='prod_rls_intento'`;
    check("no quedó la fila insertada", check2[0].n === 0);
  });
} catch (e) {
  console.error("\nERROR:", e.message);
  failures++;
} finally {
  await sql.end({ timeout: 5 });
}

console.log(`\n${"=".repeat(78)}`);
console.log(failures === 0 ? "RESULTADO: TODAS LAS COMPROBACIONES PASARON" : `RESULTADO: ${failures} FALLAS`);
console.log("=".repeat(78));
process.exitCode = failures === 0 ? 0 : 1;
