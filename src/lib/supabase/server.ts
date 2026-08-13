/**
 * Cliente Supabase para server-side (API routes, server components, server actions).
 *
 * Maneja cookies para auth context. Usa `@supabase/ssr` con Next.js cookies adapter.
 *
 * Para operaciones admin que necesitan bypassar RLS (cuando se habilite), usar
 * el service_role key directamente — NUNCA exponerlo al cliente.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[supabase/server] Faltan env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // En server components las cookies son read-only. Ignorar silenciosamente
          // — el middleware es el que se encarga de refrescarlas.
        }
      },
    },
  });
}

/**
 * Cliente con service_role key — SOLO para uso server-side en operaciones admin.
 * Bypasa RLS. NUNCA importarlo desde código que pueda llegar al cliente.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[supabase/server] Admin client requiere SUPABASE_SERVICE_ROLE_KEY (solo server).",
    );
  }

  // Import dinámico para no levantar el cliente admin en cualquier import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}