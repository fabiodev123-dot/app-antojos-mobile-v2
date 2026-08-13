import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Config de drizzle-kit (CLI de migraciones).
 *
 * Lee DATABASE_URL del .env.local. En Vercel se setea vía env vars del proyecto.
 * Usamos el connection pooler de Supabase (puerto 6543, transaction mode) para
 * serverless.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});