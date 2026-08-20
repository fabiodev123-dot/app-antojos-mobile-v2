/**
 * Auth helpers — para usar en API routes server-side.
 *
 * - getSession(): lee el user del cookie via @supabase/ssr. NO redirige.
 *   Devuelve null si no hay user.
 *
 * - requireSession(): igual pero devuelve un SessionResult discriminado.
 *   Si no hay user, el handler puede retornar el response 401 directamente
 *   sin tener que tirar excepción. Patrón:
 *
 *     const result = await requireSession();
 *     if (!result.ok) return result.response;
 *     const { session } = result;
 *
 * - requireTenantSession(): variante que exige tenantId en el JWT.
 *   Devuelve 403 si el user está logueado pero no tiene tenant_id.
 *
 * `tenantId` viene de `user.app_metadata.tenant_id` (set por el trigger
 * de bootstrap de tenant users). El user puede tener o no tenantId según
 * el tipo de cuenta:
 *
 *   - tenant_user (admin/operador de un tenant) → tenantId presente.
 *   - super_admin (accede a /admin/*) → tenantId AUSENTE.
 *
 * Cuando un super_admin invoca un endpoint tenant-scoped, la policy del
 * sistema es: rechazar con 403 si la entidad requiere tenant, salvo que
 * el body especifique explícitamente `tenant_id` (caso del panel admin).
 */

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Session = {
  user: { id: string; email: string };
  /**
   * tenantId del JWT (app_metadata.tenant_id). Null para super admins.
   * Si el endpoint requiere tenant, el handler debe chequear esto.
   */
  tenantId: string | null;
  /**
   * El user está en la tabla super_admins. Acceso global al panel /admin.
   */
  isSuperAdmin: boolean;
};

export type SessionResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

export type TenantSessionResult =
  | { ok: true; session: Session & { tenantId: string } }
  | { ok: false; response: NextResponse };

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const tenantId =
    (user.app_metadata as { tenant_id?: string } | undefined)?.tenant_id ?? null;

  // Chequear si es super admin (RLS permite self-check en super_admins).
  const { data: superAdmin } = await supabase
    .from("super_admins" as never)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string } | null };

  const cookieStore = await cookies();
  const acting = cookieStore.get("acting_tenant_id")?.value;

  if (superAdmin && acting) {
    return {
      user: { id: user.id, email: user.email },
      tenantId: acting,
      isSuperAdmin: true,
    };
  }

  return {
    user: { id: user.id, email: user.email },
    tenantId,
    isSuperAdmin: !!superAdmin,
  };
}

export async function requireSession(): Promise<SessionResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session };
}

/**
 * Exige que el user tenga tenant_id en su JWT. Útil para endpoints que
 * SIEMPRE operan en el scope de un tenant (e.g. POST /api/db/ventas_rapidas).
 *
 * Si el user no tiene tenant (e.g. super admin puro), devuelve 403 con
 * un mensaje claro. NO usar este helper si el endpoint debe aceptar
 * super admins (para esos casos usar requireSession + lógica custom).
 */
export async function requireTenantSession(): Promise<TenantSessionResult> {
  const result = await requireSession();
  if (!result.ok) return result;

  const { session } = result;
  if (!session.tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Sin tenant en JWT. Esta operación requiere un usuario asociado a un tenant.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    session: { ...session, tenantId: session.tenantId },
  };
}

/**
 * Lista de entidades que requieren tenant_id en POST/PATCH y filtrado en GET.
 * Mantener sincronizado con el schema de Drizzle (columnas `tenant_id`).
 */
export const ENTITIES_WITH_TENANT = new Set<string>([
  "ventas_rapidas",
  "pedidos",
  "movimientos_stock",
]);
