import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/state
 *
 * Diagnóstico de infraestructura (env vars, sesión, conectividad con Supabase).
 *
 * ⚠️ SEGURIDAD — Esta ruta NO es pública.
 *
 * Antes de esta corrección, el middleware excluía `/api/debug/*` de la
 * autenticación y esta ruta usaba el cliente admin (service role, bypasea
 * RLS) para devolver metadata de tenants (id, slug, name, status, plan).
 * Esoallowía que CUALQUIER persona en internet hiciera:
 *
 *     curl https://<host>/api/debug/state
 *
 * y obtuviera el detalle de todos los negocios clientes.
 *
 * Ahora:
 * - Requiere sesión de super admin (misma regla que `/admin/*`).
 * - En producción exige además el header `x-debug-secret` con el valor de
 *   `DEBUG_STATE_SECRET` (env var). Sin él → 404 (no revelamos que existe).
 * - Nunca devuelve datos de tenants: solo conteos y el estado de la
 *   configuración. Para ver tenants reales está el panel `/admin`.
 *
 * En desarrollo (`NODE_ENV !== "production"`) el secret NO es requerido,
 * para no frenar el diagnóstico de los errores de conexión a Supabase.
 */

const DEBUG_SECRET_HEADER = "x-debug-secret";

/** Comparación en tiempo constante para no filtrar el secret por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request) {
  const isProduction = process.env.NODE_ENV === "production";

  // ── Puerta 1: secret de entorno (solo en producción) ──────────────────────
  // Se valida ANTES de tocar Supabase para no hacer queries a ciegas.
  if (isProduction) {
    const expected = process.env.DEBUG_STATE_SECRET;
    if (!expected) {
      // Configuración insegura: la variable no está definida en Vercel.
      // No exponemos la ruta en absoluto hasta que se configure.
      console.error(
        "[api/debug/state] DEBUG_STATE_SECRET no está definida. La ruta queda deshabilitada.",
      );
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const provided = req.headers.get(DEBUG_SECRET_HEADER) ?? "";
    if (!safeEqual(provided, expected)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // ── Puerta 2: sesión de super admin ───────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: superAdmin } = await supabase
    .from("super_admins" as never)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string } | null };

  if (!superAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const out: Record<string, unknown> = {
    ts: new Date().toISOString(),
    // Solo presencia de env vars. NUNCA el valor.
    env: {
      nextPublicSupabaseUrlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKeyPresent: !!(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      serviceRoleKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrlPresent: !!process.env.DATABASE_URL,
    },
    // Estado de la sesión del super admin. Sin app_metadata (podría contener
    // datos de otros tenants si el usuario tiene rol cruzado).
    session: { userId: user.id },
    isSuperAdmin: true,
  };

  // ── Diagnóstico de conectividad (sin exponer datos de tenants) ────────────
  try {
    const admin = createSupabaseAdminClient();

    // RPC: solointerested en si responde y cuántos registros hay.
    const { data: rpcData, error: rpcError } = await admin.rpc(
      "admin_list_tenants_with_stats" as never,
    );
    out.tenantsRpc = {
      ok: !rpcError,
      error: rpcError?.message ?? null,
      code: rpcError?.code ?? null,
      // Solo el conteo. El sample anterior exponía id/slug/name/status/plan.
      count: Array.isArray(rpcData) ? rpcData.length : 0,
    };

    // Verificación directa de la tabla, misma política: conteo, sin muestra.
    const { data: directData, error: directError } = await admin
      .from("tenants" as never)
      .select("id", { count: "exact", head: true });
    out.tenantsDirect = {
      ok: !directError,
      error: directError?.message ?? null,
      code: directError?.code ?? null,
      count: typeof directData === "number" ? directData : 0,
    };
  } catch (err) {
    out.adminClientError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(out, { status: 200 });
}
