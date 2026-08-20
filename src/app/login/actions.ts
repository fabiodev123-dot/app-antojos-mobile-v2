"use server";

/**
 * Login / logout server actions para la app de Antojos.
 *
 * - loginAction: signInWithPassword + redirect a /
 * - logoutAction: signOut + redirect a /login
 *
 * Acepta cualquier user autenticado (tenant user o super admin). El super
 * admin usa el selector de tenants del header para "actuar como" un tenant.
 */

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoginState, FieldErrors } from "./state";

const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "password" | undefined;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisá los campos.", fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message,
    };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
