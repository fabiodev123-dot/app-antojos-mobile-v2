"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/context";
import { logAdminAction } from "@/lib/services/audit-log";

const addUserSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email("Email inválido").max(255),
  role: z.enum(["owner", "admin", "operador"]),
});

const removeUserSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1, "userId requerido"),
});

export type AddUserInput = z.infer<typeof addUserSchema>;
export type RemoveUserInput = z.infer<typeof removeUserSchema>;
export type UserActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function findUserByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  return (
    data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

export async function addTenantUserAction(
  input: AddUserInput,
  tenantLabel?: string,
): Promise<UserActionResult> {
  const ctx = await requireSuperAdmin();

  const parsed = addUserSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }

  const admin = createSupabaseAdminClient();
  const { tenantId, email, role } = parsed.data;

  const user = await findUserByEmail(admin, email);
  if (!user) {
    return {
      ok: false,
      error:
        "No existe un usuario con ese email. El usuario debe registrarse primero en /login.",
    };
  }

  const { error: insertError } = await admin
    .from("tenant_users" as never)
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      role,
    } as never);

  if (insertError && insertError.code === "23505") {
    const { error: updateError } = await admin
      .from("tenant_users" as never)
      .update({ role, updated_at: new Date().toISOString() } as never)
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id);

    if (updateError) {
      return {
        ok: false,
        error: `Ya era miembro, pero no se pudo actualizar el rol: ${updateError.message}`,
      };
    }
    await logAdminAction({
      superAdminId: ctx.id,
      superAdminEmail: ctx.email,
      action: "user.role_changed",
      targetType: "user",
      targetId: user.id,
      targetLabel: email,
      metadata: { tenantId, tenantLabel, role },
    });
    revalidatePath(`/admin/tenants/${tenantId}`);
    return {
      ok: true,
      message: "El usuario ya era miembro. Rol actualizado.",
    };
  }

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  await logAdminAction({
    superAdminId: ctx.id,
    superAdminEmail: ctx.email,
    action: "user.added_to_tenant",
    targetType: "user",
    targetId: user.id,
    targetLabel: email,
    metadata: { tenantId, tenantLabel, role },
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true, message: "Usuario agregado al tenant." };
}

export async function removeTenantUserAction(
  input: RemoveUserInput,
  tenantLabel?: string,
): Promise<UserActionResult> {
  const ctx = await requireSuperAdmin();

  const parsed = removeUserSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }

  const admin = createSupabaseAdminClient();
  const { tenantId, userId } = parsed.data;

  const { data: owners, error: ownersError } = await admin
    .from("tenant_users" as never)
    .select("user_id, role")
    .eq("tenant_id", tenantId)
    .eq("role", "owner");

  if (ownersError) {
    return { ok: false, error: ownersError.message };
  }

  const isLastOwner =
    owners?.length === 1 && owners[0]?.user_id === userId;

  if (isLastOwner) {
    return {
      ok: false,
      error:
        "No podés eliminar al único owner. Asigná otro owner primero.",
    };
  }

  const { error } = await admin
    .from("tenant_users" as never)
    .delete()
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction({
    superAdminId: ctx.id,
    superAdminEmail: ctx.email,
    action: "user.removed_from_tenant",
    targetType: "user",
    targetId: userId,
    targetLabel: undefined,
    metadata: { tenantId, tenantLabel },
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true, message: "Usuario eliminado del tenant." };
}