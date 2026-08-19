import "server-only";
import { newId } from "@/lib/repositories/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AdminAction =
  | "tenant.status_changed"
  | "tenant.plan_changed"
  | "tenant.created"
  | "user.added_to_tenant"
  | "user.removed_from_tenant"
  | "user.role_changed"
  | "system.login";

export async function logAdminAction(params: {
  superAdminId: string;
  superAdminEmail: string;
  action: AdminAction;
  targetType: "tenant" | "user" | "system";
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("admin_audit_log" as never).insert({
      id: newId("log"),
      super_admin_id: params.superAdminId,
      super_admin_email: params.superAdminEmail,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      target_label: params.targetLabel ?? null,
      metadata: params.metadata ?? null,
    } as never);
  } catch (e) {
    console.error("[audit-log] failed to log action:", e, params);
  }
}