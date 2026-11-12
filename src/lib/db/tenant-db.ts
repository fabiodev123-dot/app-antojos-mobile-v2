/**
 * Acceso a datos con contexto de tenant a nivel de conexión (RLS).
 *
 * POR QUÉ NO BASTA CON EL FILTRADO EN CÓDIGO
 * -------------------------------------------
 * El filtrado por tenant en la aplicación (src/lib/auth/tenant-scope.ts)
 * protege contra que la app devuelva datos ajenos. Pero si un endpoint
 * nuevo olvida ese filtro, la fuga se abre de nuevo: la conexión usa un
 * rol con BYPASSRLS y la base no frena nada.
 *
 * La segunda capa es RLS. Para que RLS sirva en la conexión directa de la
 * app, el tenant debe viajar en la SESIÓN de Postgres, vía el GUC
 * `app.tenant_id`, y las policies lo leen con `get_user_tenant_id()`.
 *
 * POR QUÉ UNA TRANSACCIÓN Y NO UN SET GLOBAL
 * -------------------------------------------
 * El pool de conexiones reutiliza conexiones entre requests. Un
 * `SET app.tenant_id = 'x'` (sin LOCAL) queda en esa conexión y el
 * siguiente request que la reutilice heredaría el tenant equivocado:
 * una fuga silenciosa y difícil de debugear.
 *
 * `SET LOCAL` dentro de una transacción:
 *   - ata el valor a esa transacción/conexión,
 *   - se resetea solo al hacer COMMIT o ROLLBACK,
 *   - y al terminar la transacción la conexión vuelve al pool limpia.
 *
 * Por eso TODO acceso tenant-scoped pasa por `withTenantDb()`.
 *
 * ALCANCE
 * -------
 * Las rutas `/api/db/*` sólo las consume el dashboard de un tenant
 * (ver src/lib/repositories/supabase-repository.ts). El panel /admin usa
 * el service role por otra vía (src/lib/services/admin-service.ts) y no
 * pasa por acá.
 *
 * El super admin también opera acá, siempre acotado a un tenant:
 *   - si tiene `acting_tenant_id`, ese es su tenant;
 *   - si no, debe pasar `tenant_id` explícito.
 * La lectura global la resuelve el panel admin, no estas rutas.
 */

import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "./index";
import type { db as DbType } from "./index";

/** Centinela: "esta conexión no fijó tenant". Las policies devuelven 0 filas. */
export const TENANT_SENTINEL = "__none__";

/**
 * Ejecuta un callback dentro de una transacción con el contexto de tenant
 * seteado, para que las policies RLS apliquen.
 *
 * @param tenantId  Tenant contra el que se opera. `null` = sin tenant
 *                  (la conexión queda con el sentinel y las policies
 *                  devuelven 0 filas → fail closed).
 * @param fn        Callback que recibe el cliente transaccional.
 */
export async function withTenantDb<T>(
  tenantId: string | null,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    // SET LOCAL: vale sólo dentro de esta transacción y se resetea al
    // terminar, así la conexión vuelve limpia al pool.
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${tenantId ?? TENANT_SENTINEL}, true)`,
    );
    return fn(tx as unknown as Tx);
  });
}

/**
 * Cliente transaccional.
 *
 * El tipo real de Drizzle para una transacción es un `PgTransaction`, que
 * no es asignable al tipo del cliente raíz (los métodos de `transaction` y
 * `execute` difieren en firma). Se expone el tipo del cliente raíz para que
 * los call sites puedan encadenar `select().from().where()` sin casts.
 */
export type Tx = typeof DbType;
