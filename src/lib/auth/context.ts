/**
 * Auth context — Server-side helpers
 *
 * Funciones para validar sesión en Server Components y Server Actions.
 * Usa @supabase/ssr con cookies de Next.js.
 *
 * - requireSuperAdmin(): para /admin/* — redirige a /login si no hay user
 *   o si el user no está en la tabla super_admins.
 * - getCurrentUserOrNull(): para páginas que muestran UI distinta si hay
 *   sesión (no redirige).
 * - getCurrentSuperAdminOrNull(): chequea membresía en super_admins sin redirigir.
 */

import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string;
};

export type SuperAdminContext = AuthUser & {
  /** Por si más adelante queremos guardar metadata del super admin (created_at, etc.) */
  isSuperAdmin: true;
  createdAt: string;
};

/**
 * Devuelve el user autenticado o null. NO redirige.
 * Útil para UI condicional (mostrar "Iniciar sesión" vs "Salir").
 */
export async function getCurrentUserOrNull(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  return { id: user.id, email: user.email };
}

/**
 * Devuelve el super admin autenticado o null. NO redirige.
 */
export async function getCurrentSuperAdminOrNull(): Promise<SuperAdminContext | null> {
  const user = await getCurrentUserOrNull();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("super_admins" as never)
    .select("id, created_at")
    .eq("id", user.id)
    .single() as { data: { id: string; created_at: string } | null; error: unknown };

  if (error || !data) return null;
  return {
    id: data.id,
    email: user.email,
    isSuperAdmin: true,
    createdAt: data.created_at,
  };
}

/**
 * Garantiza que el request viene de un super admin.
 * Si no hay sesión → redirect a /login?reason=unauthenticated
 * Si hay sesión pero no es super admin → redirect a /login?reason=forbidden
 *
 * Devuelve el contexto completo para que el caller no re-query.
 */
export async function requireSuperAdmin(): Promise<SuperAdminContext> {
  const user = await getCurrentUserOrNull();
  if (!user) {
    redirect("/login?reason=unauthenticated");
  }

  const ctx = await getCurrentSuperAdminOrNull();
  if (!ctx) {
    redirect("/login?reason=forbidden");
  }
  return ctx;
}
