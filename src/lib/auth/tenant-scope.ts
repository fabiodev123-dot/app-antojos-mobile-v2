/**
 * Tenant scope — resolución fail-closed del tenant para operaciones tenant-scoped.
 *
 * PROBLEMA QUE RESUELVE
 * ----------------------
 * Las rutas de API filtraban por tenant con el patrón:
 *
 *     if (requiresTenant && session.tenantId && !session.isSuperAdmin) {
 *       filters.push(eq(t.tenantId, session.tenantId));
 *     }
 *
 * Si `session.tenantId` es `null` (usuario autenticado SIN tenant) NINGUNA
 * rama se cumple, el array de filtros queda vacío y el query termina siendo
 * `WHERE id = $1` — sin restricción de tenant. Eso permite que un usuario
 * autenticado sin tenant lea, edite y borre filas de CUALQUIER tenant.
 *
 * El fallo fue VERIFICADO empíricamente contra la app real:
 *   GET /api/db/productos        -> 200 con las filas de todos los tenants
 *   GET /api/db/productos?id=X   -> 200 con la fila de otro tenant
 *
 * LA REGLA
 * -------
 * Si la entidad requiere tenant y el caller NO tiene un tenant resoluble,
 * la operación se RECHAZA con 403. Nunca se ejecuta un query sin filtro de
 * tenant. El aislamiento se decide UNA vez, acá, no en cada ruta.
 *
 * CASOS
 * -----
 * | session.tenantId | isSuperAdmin | requiresTenant | Resultado            |
 * |------------------|--------------|----------------|---------------------|
 * | sí               | no           | sí             | scope = ese tenant  |
 * | no               | sí           | sí             | sin tenant → 403    |
 * | no               | no           | sí             | sin tenant → 403    |
 * | (cualquiera)     | (cualquiera) | no             | sin scope (global)  |
 *
 * El super admin NO tiene tenant propio por diseño (misma regla que
 * `src/lib/auth/session.ts`): para operar sobre un tenant concreto debe
 * pasar `tenant_id` explícito en el body, y ese valor se valida contra la
 * lista de tenants reales antes de usarse (ver `assertTenantExists`).
 */

import "server-only";
import { NextResponse } from "next/server";
import { and, eq, type SQL } from "drizzle-orm";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type TenantScope = {
  /**
   * Tenant contra el que se opera.
   *
   * - `null` + `isSuperAdmin: false` → la operación NO requiere tenant.
   * - `null` + `isSuperAdmin: true`  → lectura GLOBAL (panel /admin).
   * - string → operación acotada a ese tenant.
   */
  tenantId: string | null;
  /** El caller es super admin (acceso global al panel /admin). */
  isSuperAdmin: boolean;
};

export type TenantScopeResult =
  | { ok: true; scope: TenantScope }
  | { ok: false; response: NextResponse };

/**
 * Resuelve el scope de tenant para una operación.
 *
 * @param session            Sesión resuelta por `requireSession()`.
 * @param requiresTenant     Si la entidad/operación está atada a un tenant.
 * @param requestedTenantId  Tenant pedido explícitamente (cuerpo de la
 *                           petición). Sólo lo honra un super admin.
 */
/**
 * Modo de la operación.
 *
 * - `read`: el super admin puede operar GLOBALMENTE (ver todos los tenants).
 *   Es lo que necesita el panel `/admin` para listar todo. El filtro de
 *   tenant se aplica sólo si se pasa `tenant_id` explícito.
 * - `write`: el super admin DEBE acotar a un tenant explícito. Escribir
 *   sin acotar dejaría filas huérfanas (sin `tenant_id` o con el de otro).
 */
export type TenantScopeMode = "read" | "write";

/**
 * Resuelve el scope de tenant para una operación.
 *
 * @param session            Sesión resuelta por `requireSession()`.
 * @param requiresTenant     Si la entidad/operación está atada a un tenant.
 * @param requestedTenantId  Tenant pedido explícitamente (query o cuerpo).
 *                           Sólo lo honra un super admin.
 * @param mode               `read` (global permitido a super admin) o
 *                           `write` (tenant explícito obligatorio).
 */
export async function resolveTenantScope(
  session: { tenantId: string | null; isSuperAdmin: boolean },
  requiresTenant: boolean,
  requestedTenantId?: string | null,
  mode: TenantScopeMode = "read",
): Promise<TenantScopeResult> {
  // Sin scope de tenant: la operación no está atada a un tenant.
  if (!requiresTenant) {
    return {
      ok: true,
      scope: { tenantId: null, isSuperAdmin: session.isSuperAdmin },
    };
  }

  // Tenant propio (usuario de tenant, o super admin "acting as" un tenant).
  if (session.tenantId) {
    return {
      ok: true,
      scope: { tenantId: session.tenantId, isSuperAdmin: session.isSuperAdmin },
    };
  }

  // Super admin sin tenant propio: puede pedir uno explícito.
  if (session.isSuperAdmin) {
    if (requestedTenantId) {
      const exists = await tenantValidator(requestedTenantId);
      if (!exists) {
        return {
          ok: false,
          response: NextResponse.json(
            { ok: false, error: `Tenant desconocido: ${requestedTenantId}` },
            { status: 400 },
          ),
        };
      }
      return {
        ok: true,
        scope: { tenantId: requestedTenantId, isSuperAdmin: true },
      };
    }

    // Lectura global: el super admin puede ver todos los tenants.
    // Esto es lo que usa el panel `/admin`. `tenantId: null` significa
    // "sin filtro" y sólo se alcanza con isSuperAdmin = true.
    if (mode === "read") {
      return {
        ok: true,
        scope: { tenantId: null, isSuperAdmin: true },
      };
    }

    // Escritura sin acotar el tenant → fail closed.
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Esta escritura requiere un tenant. Super admins deben pasar tenant_id explícitamente.",
        },
        { status: 403 },
      ),
    };
  }

  // Usuario autenticado sin tenant: fail closed.
  return {
    ok: false,
    response: NextResponse.json(
      {
        ok: false,
        error:
          "Tu cuenta no está asociada a un tenant. Esta operación requiere uno.",
      },
      { status: 403 },
    ),
  };
}

/**
 * ¿Existe el tenant indicado?
 *
 * Se consulta con el cliente admin (service role) porque la policy RLS de
 * `tenants` es `tenants_select_own`: sólo deja ver al `authenticated` su
 * propio tenant, y un super admin necesita poder validar cualquier tenant.
 */
export async function tenantExists(tenantId: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("tenants" as never)
      .select("id")
      .eq("id", tenantId)
      .maybeSingle() as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error("[tenant-scope] tenantExists error:", error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error("[tenant-scope] tenantExists threw:", err);
    return false;
  }
}

/**
 * Validador de tenant inyectable. Permite testear `resolveTenantScope` sin
 * tocar la base de datos (los tests inyectan un stub).
 */
export type TenantValidator = (tenantId: string) => Promise<boolean>;

let tenantValidator: TenantValidator = tenantExists;

/** Reemplaza el validador de tenant (sólo tests). Devuelve el anterior. */
export function setTenantValidator(validator: TenantValidator): TenantValidator {
  const previous = tenantValidator;
  tenantValidator = validator;
  return previous;
}

/**
 * Construye el filtro de tenant para una consulta.
 *
 * Devuelve `undefined` cuando la operación no tiene scope (entidad sin
 * tenant, o super admin con acceso global explícito). Cuando la operación
 * SÍ requiere tenant y hay scope, devuelve la condición SQL.
 */
export function tenantFilter(
  scope: TenantScope,
  requiresTenant: boolean,
  tenantColumn: SQL | undefined,
): SQL | undefined {
  if (!requiresTenant || !scope.tenantId || !tenantColumn) return undefined;
  return eq(tenantColumn, scope.tenantId);
}

/**
 * Combinación de filtros segura: si la operación requiere tenant, el filtro
 * de tenant es OBLIGATORIO y no se puede omitir.
 */
export function withTenantScope(
  filters: (SQL | undefined)[],
  scope: TenantScope,
  requiresTenant: boolean,
  tenantColumn: SQL | undefined,
): SQL | undefined {
  const clean = filters.filter((f): f is SQL => f !== undefined);
  const tenant = tenantFilter(scope, requiresTenant, tenantColumn);
  if (tenant) clean.push(tenant);
  return clean.length ? and(...clean) : undefined;
}
