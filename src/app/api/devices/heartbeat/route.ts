import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { newId } from "@/lib/repositories/types";

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

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autenticado" },
      { status: 401 },
    );
  }

  const tenantId = (user.app_metadata as { tenant_id?: string } | undefined)
    ?.tenant_id;
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Sin tenant en JWT" },
      { status: 403 },
    );
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