"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/context";
import { logAdminAction } from "@/lib/services/audit-log";

const updateTenantSchema = z.object({
  status: z.enum(["active", "suspended", "trial"]),
  plan: z.enum(["free", "basic", "pro"]),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export type UpdateTenantResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateTenantAction(
  tenantId: string,
  input: UpdateTenantInput,
  previous?: { status: string; plan: string; name: string },
): Promise<UpdateTenantResult> {
  const ctx = await requireSuperAdmin();

  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first ? first.message : "Datos inválidos",
    };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("tenants" as never)
    .update({
      status: parsed.data.status,
      plan: parsed.data.plan,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", tenantId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (previous) {
    if (previous.status !== parsed.data.status) {
      await logAdminAction({
        superAdminId: ctx.id,
        superAdminEmail: ctx.email,
        action: "tenant.status_changed",
        targetType: "tenant",
        targetId: tenantId,
        targetLabel: previous.name,
        metadata: { from: previous.status, to: parsed.data.status },
      });
    }
    if (previous.plan !== parsed.data.plan) {
      await logAdminAction({
        superAdminId: ctx.id,
        superAdminEmail: ctx.email,
        action: "tenant.plan_changed",
        targetType: "tenant",
        targetId: tenantId,
        targetLabel: previous.name,
        metadata: { from: previous.plan, to: parsed.data.plan },
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true };
}