/**
 * PRUEBA DE FUEGO DE LA DOBLE CAPA (L4).
 *
 * Simula un endpoint nuevo que OLVIDÓ el filtro por tenant en el código
 * (el error más común y el más difícil de detectar en review).
 *
 * Con la doble capa (código + RLS), ese endpoint sigue sin poder leer
 * datos de otros tenants, porque la base de datos frena la lectura.
 *
 * Hace la consulta DIRECTAMENTE a la base con el rol de la app y el
 * GUC de tenant seteado, pero SIN el filtro `WHERE tenant_id = ...` que
 * agrega el código de aplicación.
 *
 * Uso: node scripts/test-rls-backstop.mjs
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

const postgres = (await import("postgres")).default;

// Misma conexión que usa la app: APP_DATABASE_URL (rol antojos_app).
const url = process.env.APP_DATABASE_URL;
if (!url) {
  console.error("Falta APP_DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 5 });

let failures = 0;
function check(label, cond, detail) {
  if (cond) console.log(`    PASS  ${label}`);
  else {
    failures++;
    console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("=".repeat(78));
console.log("BACKSTOP DE RLS — endpoint sin filtro por tenant en el código");
console.log("=".repeat(78));

// ── Escenario 1: el endpoint olvida el filtro ───────────────────────────────
console.log("\n[1] Query SIN filtro por tenant (como un endpoint con bug)");
console.log("    SELECT * FROM productos   ← sin WHERE tenant_id");
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', 'tenant_antojos', true)`;
  const rows = await tx`SELECT tenant_id, count(*)::int AS n FROM productos GROUP BY tenant_id`;
  console.log(`    tenants devueltos: ${JSON.stringify(rows)}`);

  const total = rows.reduce((acc, r) => acc + Number(r.n), 0);
  const ajenos = rows.filter((r) => r.tenant_id !== "tenant_antojos");

  check("sólo devuelve filas del tenant de la sesión", ajenos.length === 0, `ajenos=${JSON.stringify(ajenos)}`);
  check("devuelve las 97 filas propias", total === 97, `total=${total}`);
});

console.log("\n[2] Query a clientes SIN filtro (otra tabla)");
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', 'tenant_antojos', true)`;
  const rows = await tx`SELECT tenant_id, count(*)::int AS n FROM clientes GROUP BY tenant_id`;
  console.log(`    tenants devueltos: ${JSON.stringify(rows)}`);
  const ajenos = rows.filter((r) => r.tenant_id !== "tenant_antojos");
  check("sólo devuelve filas propias", ajenos.length === 0, `ajenos=${JSON.stringify(ajenos)}`);
});

console.log("\n[3] Query a pedidos SIN filtro (con JOIN a items)");
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', 'tenant_antojos', true)`;
  const rows = await tx`
    SELECT p.tenant_id, count(*)::int AS n
    FROM pedidos p LEFT JOIN pedido_items i ON p.id = i.pedido_id
    GROUP BY p.tenant_id
  `;
  console.log(`    tenants devueltos: ${JSON.stringify(rows)}`);
  const ajenos = rows.filter((r) => r.tenant_id !== "tenant_antojos");
  check("sólo devuelve filas propias", ajenos.length === 0, `ajenos=${JSON.stringify(ajenos)}`);
});

// ── Escenario 4: escritura sin filtro (el bug más grave) ────────────────────
console.log("\n[4] UPDATE sin filtro: intentar tocar una fila de otro tenant");
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', 'tenant_antojos', true)`;

  // El UPDATE no da error: RLS oculta la fila ajena, así que el UPDATE
  // afecta 0 filas (fail-closed silencioso). Lo que importa es que la
  // fila NO se modifique.
  const result = await tx`
      UPDATE productos SET nombre = 'HACK' WHERE id = 'prod_test_iso_1'
      RETURNING id
    `;
  const afectadas = result.length;
  console.log(`    filas afectadas: ${afectadas}`);

  check("el UPDATE no afectaró ninguna fila", afectadas === 0, `afectadas=${afectadas}`);

  // La fila ajena es INVISIBLE para el rol con RLS, así que no se puede
  // verificar desde esta conexión: se verifica con la conexión owner.
  const owner = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
  });
  try {
    const despues = await owner`SELECT nombre FROM productos WHERE id = 'prod_test_iso_1'`;
    console.log(`    nombre de la fila ajena (visto por el owner): ${JSON.stringify(despues[0]?.nombre)}`);
    check(
      "la fila ajena quedó sin modificar",
      despues[0]?.nombre === "PRODUCTO AISLAMIENTO BORRAR",
      `nombre=${despues[0]?.nombre}`,
    );
  } finally {
    await owner.end({ timeout: 5 });
  }
});

// ── Escenario 5: sin tenant en la sesión ───────────────────────────────────
console.log("\n[5] Sin tenant en la sesión: TODO debe estar bloqueado");
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', '__none__', true)`;
  const p = await tx`SELECT count(*)::int AS n FROM productos`;
  const c = await tx`SELECT count(*)::int AS n FROM clientes`;
  const d = await tx`SELECT count(*)::int AS n FROM pedidos`;
  console.log(`    productos=${p[0].n} clientes=${c[0].n} pedidos=${d[0].n}`);
  check("productos: 0 filas", p[0].n === 0, `n=${p[0].n}`);
  check("clientes: 0 filas", c[0].n === 0, `n=${c[0].n}`);
  check("pedidos: 0 filas", d[0].n === 0, `n=${d[0].n}`);
});

// ── Escenario 6: cambio de tenant en la misma conexión (pool safety) ───────
console.log("\n[6] Pool safety: el tenant NO debe filtrarse entre transacciones");
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', 'tenant_test_iso', true)`;
  const a = await tx`SELECT count(*)::int AS n FROM productos`;
  console.log(`    tx con tenant_test_iso -> ${a[0].n} filas`);
  check("ve 1 fila (la del tenant B)", a[0].n === 1, `n=${a[0].n}`);
});
// Transacción siguiente, sin setear nada: debe ver 0, no 1.
await sql.begin(async (tx) => {
  const b = await tx`SELECT count(*)::int AS n FROM productos`;
  const guc = await tx`SELECT current_setting('app.tenant_id', true) AS g`;
  console.log(`    tx siguiente (sin setear) -> ${b[0].n} filas, GUC=${JSON.stringify(guc[0].g)}`);
  check("la siguiente transacción ve 0 filas", b[0].n === 0, `n=${b[0].n}`);
  check("el GUC quedó limpio", !guc[0].g || guc[0].g === "__none__" || guc[0].g === "", `guc=${guc[0].g}`);
});

await sql.end({ timeout: 5 });

console.log(`\n${"=".repeat(78)}`);
console.log(failures === 0 ? "RESULTADO: RLS FRENA LA FUGA (doble capa confirmada)" : `RESULTADO: ${failures} FALLAS`);
console.log("=".repeat(78));
process.exitCode = failures === 0 ? 0 : 1;
