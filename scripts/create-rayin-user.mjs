import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

function newId(prefix) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

const EMAIL = "rayin@antojos.com";
const PASSWORD = "antojosrayin123";

async function main() {
  // 1. Check if user already exists
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = existing?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

  if (found) {
    console.log(`User ${EMAIL} ya existe (id: ${found.id}). Actualizando password...`);
    const { error: updateErr } = await admin.auth.admin.updateUserById(found.id, {
      password: PASSWORD,
    });
    if (updateErr) {
      console.error("Error actualizando password:", updateErr.message);
      process.exit(1);
    }
    console.log("Password actualizada OK.");
  } else {
    // 2. Create user
    console.log(`Creando user ${EMAIL}...`);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      console.error("Error creando user:", createErr?.message);
      process.exit(1);
    }
    console.log(`User creado: ${created.user.id}`);

    // 3. Link to tenant_antojos
    const { error: insertErr } = await admin.from("tenant_users").insert({
      id: newId("tu"),
      tenant_id: "tenant_antojos",
      user_id: created.user.id,
      role: "admin",
    });
    if (insertErr && insertErr.code !== "23505") {
      console.error("Error vinculando al tenant:", insertErr.message);
      process.exit(1);
    }
    console.log("Vinculado a tenant_antojos como admin.");
  }

  console.log("\nListo. Login: rayin@antojos.com / antojosrayin123");
}

main();
