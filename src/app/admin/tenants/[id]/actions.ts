"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/context";

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
): Promise<UpdateTenantResult> {
  await requireSuperAdmin();

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

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true };
}