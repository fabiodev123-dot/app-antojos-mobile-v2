/**
 * Verifica el impacto REAL de L4 sobre los usuarios existentes.
 *
 * Caso sospechoso: un usuario con tenant en `tenant_users` pero SIN
 * `app_metadata.tenant_id` en el JWT. La app lo resuelve por fallback
 * (src/lib/auth/session.ts), pero `get_user_tenant_id()` (que usa RLS)
 * sólo lee el JWT → con RLS activo ese usuario ve 0 filas.
 *
 * Uso: node scripts/test-user-impact.mjs
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
const app = postgres(process.env.APP_DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 5 });
const owner = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 5 });

console.log("=".repeat(78));
console.log("IMPACTO DE L4 SOBRE LOS USUARIOS EXISTENTES");
console.log("=".repeat(78));

// Usuarios con su tenant real (de tenant_users)
const usuarios = await owner`
  SELECT u.email,
         u.id::text AS user_id,
         COALESCE(tu.tenant_id, '(ninguno)') AS tenant_id,
         (u.raw_app_meta_data ? 'tenant_id') AS jwt_tiene_tenant,
         (u.raw_app_meta_data ->> 'tenant_id') AS jwt_tenant_id,
         (sa.user_id IS NOT NULL) AS es_super_admin
  FROM auth.users u
  LEFT JOIN tenant_users tu ON tu.user_id = u.id
  LEFT JOIN super_admins sa ON sa.user_id = u.id
  ORDER BY u.email
`;

let problemas = 0;
console.log("\nUSUARIOS:\n");
for (const u of usuarios) {
  const appMetadataTenant = u.jwt_tiene_tenant ? u.jwt_tenant_id : null;
  const tenantEfectivo = appMetadataTenant ?? u.tenant_id;

  let filasConRls = null;
  let filasSinRls = null;

  if (tenantEfectivo && tenantEfectivo !== "(ninguno)") {
    // Con RLS: GUC seteado al tenant que la APP resolvería.
    await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id', ${tenantEfectivo}, true)`;
      const r = await tx`SELECT count(*)::int AS n FROM productos`;
      filasConRls = r[0].n;
    });
    // Sin RLS (owner): cuánto hay realmente para ese tenant.
    const r = await owner`SELECT count(*)::int AS n FROM productos WHERE tenant_id = ${tenantEfectivo}`;
    filasSinRls = r[0].n;
  }

  const roto = filasConRls !== null && filasConRls !== filasSinRls;
  const marca = roto ? "  <<< ROTO" : "";

  console.log(`  ${u.email}`);
  console.log(`    tenant en tenant_users : ${u.tenant_id}`);
  console.log(`    tenant en el JWT       : ${appMetadataTenant ?? "(NINGUNO)"}`);
  console.log(`    super admin            : ${u.es_super_admin}`);
  if (filasConRls !== null) {
    console.log(`    productos con RLS      : ${filasConRls} (esperado: ${filasSinRls})${marca}`);
    if (roto) problemas++;
  } else {
    console.log(`    (sin tenant resoluble)`);
  }
  console.log("");
}

console.log("=".repeat(78));
if (problemas === 0) {
  console.log("RESULTADO: ningun usuario existente queda sin acceso.");
} else {
  console.log(`RESULTADO: ${problemas} usuario(s) QUEDAN SIN ACCESO con RLS activo.`);
  console.log("");
  console.log("Causa probable: el usuario tiene tenant en `tenant_users` pero NO en");
  console.log("`app_metadata.tenant_id`, y `get_user_tenant_id()` (RLS) solo lee el JWT.");
  console.log("La app lo resuelve por fallback, la base no.");
}
console.log("=".repeat(78));

await app.end({ timeout: 5 });
await owner.end({ timeout: 5 });
process.exitCode = problemas === 0 ? 0 : 1;
