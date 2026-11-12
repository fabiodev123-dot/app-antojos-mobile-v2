/**
 * Verifica qué rol de Postgres está usando la app y si RLS le aplica.
 *
 * Debe responder "antojos_app" cuando APP_DATABASE_URL está configurada,
 * y "postgres" cuando sólo existe DATABASE_URL (fallback).
 *
 * Uso: node scripts/check-app-role.mjs
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

const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
const fuente = process.env.APP_DATABASE_URL ? "APP_DATABASE_URL" : "DATABASE_URL";

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 5 });
try {
  const who = await sql`SELECT current_user AS u, session_user AS s`;
  const perms = await sql`
    SELECT rolbypassrls, rolsuper, rolcanlogin
    FROM pg_roles WHERE rolname = current_user
  `;
  const rls = await sql`
    SELECT count(*)::int AS n
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
  `;

  console.log(`fuente de la URL  : ${fuente}`);
  console.log(`current_user      : ${who[0].u}`);
  console.log(`bypassrls         : ${perms[0].rolbypassrls}`);
  console.log(`superuser         : ${perms[0].rolsuper}`);
  console.log(`tablas con RLS    : ${rls[0].n}`);

  const esRestringido = perms[0].rolbypassrls === false && perms[0].rolsuper === false;
  console.log(
    esRestringido
      ? "\nOK — la app conecta con un rol sujeto a RLS."
      : "\nATENCION — la app conecta con un rol que BYPASSEA RLS. La segunda capa de aislamiento NO aplica.",
  );
  process.exitCode = esRestringido ? 0 : 1;
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
