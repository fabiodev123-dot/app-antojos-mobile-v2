"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/context";
import { logAdminAction } from "@/lib/services/audit-log";
import { newId } from "@/lib/repositories/types";

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

export type CreateUserResult =
  | { ok: true; userId: string; email: string; password: string; message: string }
  | { ok: false; error: string };

const createUserSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email("Email inválido").max(255),
  role: z.enum(["owner", "admin", "operador"]),
});

function generateStrongPassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = lower + upper + digits + symbols;
  const PWD_LEN = 20;
  const bytes = new Uint8Array(PWD_LEN);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < PWD_LEN; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let pwd = "";
  pwd += lower[bytes[0] % lower.length];
  pwd += upper[bytes[1] % upper.length];
  pwd += digits[bytes[2] % digits.length];
  pwd += symbols[bytes[3] % symbols.length];
  for (let i = 4; i < PWD_LEN; i++) {
    pwd += all[bytes[i] % all.length];
  }
  return pwd
    .split("")
    .map((c, i) => ({ c, r: bytes[i] }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.c)
    .join("");
}

export async function createTenantUserAction(
  input: { tenantId: string; email: string; role: "owner" | "admin" | "operador" },
  tenantLabel?: string,
): Promise<CreateUserResult> {
  const ctx = await requireSuperAdmin();

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }

  const admin = createSupabaseAdminClient();
  const { tenantId, email, role } = parsed.data;

  const existing = await findUserByEmail(admin, email);
  if (existing) {
    return {
      ok: false,
      error: "Ya existe un usuario con ese email. Usá la opción 'Agregar' para sumarlo al tenant.",
    };
  }

  const password = generateStrongPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tenant_id: tenantId, role },
  } as never);

  if (createError || !created?.user) {
    return {
      ok: false,
      error: createError?.message ?? "No se pudo crear el usuario.",
    };
  }

  const { error: insertError } = await admin
    .from("tenant_users" as never)
    .insert({
      id: newId("tu"),
      tenant_id: tenantId,
      user_id: created.user.id,
      role,
    } as never);

  if (insertError) {
    return { ok: false, error: `User creado pero no se pudo asociar al tenant: ${insertError.message}` };
  }

  await logAdminAction({
    superAdminId: ctx.id,
    superAdminEmail: ctx.email,
    action: "user.created_and_added",
    targetType: "user",
    targetId: created.user.id,
    targetLabel: email,
    metadata: { tenantId, tenantLabel, role },
  });

  revalidatePath(`/admin/tenants/${tenantId}`);

  return {
    ok: true,
    userId: created.user.id,
    email,
    password,
    message: "Usuario creado y asociado al tenant. La password se muestra una sola vez.",
  };
}

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

  const { data: owners, error: ownersError } = (await admin
    .from("tenant_users" as never)
    .select("user_id, role")
    .eq("tenant_id", tenantId)
    .eq("role", "owner")) as { data: { user_id: string; role: string }[] | null; error: { message: string } | null };

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