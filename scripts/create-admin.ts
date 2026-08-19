import { config } from "dotenv";
config({ path: ".env.local" });

import { createSupabaseAdminClient } from "../src/lib/supabase/server";

const [, , emailArg, passwordArg] = process.argv;

function fail(msg: string): never {
  console.error(`\u274C ${msg}`);
  console.error(`   Uso: npm run admin:create -- <email> <password>`);
  process.exit(1);
}

if (!emailArg || !passwordArg) {
  fail("Faltan argumentos: email y password.");
}

const email = emailArg.toLowerCase().trim();
const password = passwordArg;

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail(`Email inv\u00E1lido: ${email}`);
}

if (password.length < 8) {
  fail("Password debe tener al menos 8 caracteres.");
}

async function main() {
  const admin = createSupabaseAdminClient();

  console.log(`\uD83D\uDD0D Buscando user ${email} en auth.users...`);
  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) {
    fail(`Error listando users: ${listError.message}`);
  }
  const existing = listData?.users.find(
    (u) => u.email?.toLowerCase() === email,
  );
  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`   Ya existe con id ${userId}`);
  } else {
    console.log(`\uD83D\uDC64 Creando user en auth.users...`);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created?.user) {
      fail(`No se pudo crear el user: ${error?.message ?? "unknown"}`);
    }
    userId = created.user.id;
    console.log(`   Creado con id ${userId}`);
  }

  console.log(`\uD83D\uDEE1\uFE0F  Asegurando membres\u00EDa en super_admins...`);
  const { error: insertError } = await admin
    .from("super_admins" as never)
    .insert({ id: userId } as never);

  if (insertError) {
    if (insertError.code === "23505") {
      console.log(`   Ya es super admin. Idempotente: no hice nada.`);
    } else {
      fail(`Error insertando en super_admins: ${insertError.message}`);
    }
  } else {
    console.log(`   Insertado en super_admins.`);
  }

  console.log(`\n\u2705 Listo. Logueate en /login con:`);
  console.log(`   email:    ${email}`);
  console.log(`   password: (la que pasaste)`);
}

main().catch((e) => {
  console.error(
    "\u274C Error inesperado:",
    e instanceof Error ? e.message : e,
  );
  process.exit(1);
});
