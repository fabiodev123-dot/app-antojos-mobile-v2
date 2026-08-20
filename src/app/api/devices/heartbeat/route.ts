import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { newId } from "@/lib/repositories/types";

/**
 * POST /api/devices/heartbeat
 *
 * Registra/actualiza la sesión del dispositivo en `device_sessions`.
 *
 * Comportamiento multi-tenant:
 * - Tenant user (con tenant_id en app_metadata) → upsert normal en su tenant.
 * - Super admin (sin tenant_id) → responde 204 silenciosamente. NO se trackea
 *   el dispositivo porque no hay tenant a qué atribuirlo. Esto es intencional:
 *   la tabla `device_sessions` tiene FK a `tenants(id)` NOT NULL, así que un
 *   super admin puro no puede escribir ahí. Trackear devices del super admin
 *   podría ir en una tabla separada si se necesita en el futuro.
 *
 * Best-effort: el cliente (useDeviceHeartbeat) hace fetch sin esperar
 * respuesta útil — los 403/500 se ignoran. PERO cuando el user SÍ está
 * autenticado pero le falta tenant_id (caso super admin), es molesto llenar
 * el log con errores. Por eso respondemos 204 en ese caso.
 */
const heartbeatSchema = z.object({
  deviceId: z.string().min(1).max(128),
  appVersion: z.string().max(32).optional(),
});

const PLATFORM_KEYWORDS: Array<[RegExp, string]> = [
  [/iPhone|iPad|iPod/i, "ios"],
  [/Android/i, "android"],
  [/(PWA|standalone|InstallActive|standalone-app)/i, "pwa"],
];

function detectPlatform(userAgent: string | null): string | null {
  if (!userAgent) return null;
  for (const [regex, platform] of PLATFORM_KEYWORDS) {
    if (regex.test(userAgent)) return platform;
  }
  return "web";
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión → el cliente no debería estar mandando heartbeat. Respondemos
  // 401 igual que antes (caso: cookie expirada, el cliente va a refrescar).
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autenticado" },
      { status: 401 },
    );
  }

  const tenantId = (user.app_metadata as { tenant_id?: string } | undefined)
    ?.tenant_id;

  // Super admin sin tenant: heartbeat silencioso, no trackeamos el device.
  // (Lo dejamos en un comment visible para el próximo que lea.)
  if (!tenantId) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get("user-agent");
  const platform = detectPlatform(userAgent);
  const now = new Date().toISOString();

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("device_sessions" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("device_id", parsed.data.deviceId)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) {
    const { error } = await admin
      .from("device_sessions" as never)
      .update({
        last_seen: now,
        user_agent: userAgent,
        platform,
        app_version: parsed.data.appVersion ?? null,
      } as never)
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  } else {
    const { error } = await admin
      .from("device_sessions" as never)
      .insert({
        id: newId("dev"),
        tenant_id: tenantId,
        user_id: user.id,
        device_id: parsed.data.deviceId,
        user_agent: userAgent,
        platform,
        app_version: parsed.data.appVersion ?? null,
        first_seen: now,
        last_seen: now,
      } as never);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, ts: now });
}
