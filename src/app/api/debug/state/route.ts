"use server";

import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const out: Record<string, unknown> = {
    ts: new Date().toISOString(),
    env: {
      nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      publishableKeyPresent: !!(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      anonKeyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrlPresent: !!process.env.DATABASE_URL,
    },
  };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    out.session = user
      ? {
          id: user.id,
          email: user.email,
          appMetadata: user.app_metadata ?? null,
        }
      : null;

    if (user) {
      const { data: superAdmin, error: superAdminError } = await supabase
        .from("super_admins" as never)
        .select("id, user_id, created_at")
        .eq("user_id", user.id)
        .maybeSingle() as {
          data: { id: string; user_id: string; created_at: string } | null;
          error: { message: string; code?: string } | null;
        };
      out.isSuperAdmin = !!superAdmin;
      out.superAdminError = superAdminError ?? null;
    } else {
      out.isSuperAdmin = false;
    }
  } catch (err) {
    out.sessionError = err instanceof Error ? err.message : String(err);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: rpcData, error: rpcError } = await admin.rpc(
      "admin_list_tenants_with_stats" as never
    );
    out.tenantsRpc = {
      ok: !rpcError,
      error: rpcError?.message ?? null,
      code: rpcError?.code ?? null,
      count: Array.isArray(rpcData) ? rpcData.length : 0,
      sample: Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null,
    };

    const { data: directData, error: directError } = await admin
      .from("tenants" as never)
      .select("id, slug, name, status, plan, created_at")
      .order("name");
    out.tenantsDirect = {
      ok: !directError,
      error: directError?.message ?? null,
      code: directError?.code ?? null,
      count: Array.isArray(directData) ? directData.length : 0,
      sample: Array.isArray(directData) && directData.length > 0 ? directData[0] : null,
    };
  } catch (err) {
    out.adminClientError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(out, { status: 200 });
}
