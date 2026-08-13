/**
 * Cliente Drizzle para Antojos — SERVER-SIDE ONLY.
 *
 * Solo debe importarse desde API routes, server components o server actions.
 * El cliente NUNCA debe importar este módulo (rompe el build porque
 * `postgres-js` usa módulos Node como `fs`, `net`, `tls` que no existen en
 * el browser).
 *
 * El import "server-only" lanza error claro si alguien lo importa por error
 * desde un componente client.
 *
 * Configuración:
 * - `DATABASE_URL` debe estar en .env.local (NO en el bundle del cliente).
 *   Formato: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
 * - En Vercel, se setea via env vars del proyecto (Production + Preview).
 *
 * Importación LAZY: el chequeo de DATABASE_URL y la apertura de conexión se
 * hacen al PRIMER uso, no al module load.
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Singleton del cliente postgres (evita connection leaks en hot-reload de Next.js).
declare global {
  // eslint-disable-next-line no-var
  var __antojosPgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __antojosDb: ReturnType<typeof drizzle> | undefined;
}

function getClient(): ReturnType<typeof postgres> {
  if (globalThis.__antojosPgClient) return globalThis.__antojosPgClient;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "[db] DATABASE_URL no está definida. Seteala en .env.local o en las env vars de Vercel. " +
        "Si querés trabajar solo con localStorage, no uses los repos de Supabase.",
    );
  }
  const client = postgres(connectionString, {
    // Pool chico para serverless. Vercel escala horizontal con funciones efímeras;
    // cada función abre ~1 conexión.
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // pgBouncer en transaction mode no soporta PREPARE
  });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__antojosPgClient = client;
  }
  return client;
}

function getDb(): ReturnType<typeof drizzle> {
  if (globalThis.__antojosDb) return globalThis.__antojosDb;
  const db = drizzle(getClient(), { schema });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__antojosDb = db;
  }
  return db;
}

/**
 * Proxy que inicializa el cliente en el primer uso. Permite importar este módulo
 * sin chequear `DATABASE_URL` en module load.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
}) as ReturnType<typeof drizzle>;
export type Db = ReturnType<typeof drizzle>;