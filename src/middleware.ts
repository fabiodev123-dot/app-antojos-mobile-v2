/**
 * Middleware — protege /admin/*
 *
 * Si no hay sesión → redirect a /login?reason=unauthenticated
 * Si hay sesión pero el user no está en super_admins → redirect a /login?reason=forbidden
 *
 * Usa el cliente de @supabase/ssr con cookies del request (patrón edge).
 * No usa next/headers porque el middleware corre en edge runtime.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Inicializar response que vamos a ir mutando para refresh de cookies
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Si faltan env vars, dejamos pasar pero logueamos.
    // El server component revalidará y romperá ruidosamente.
    console.error("[middleware] Faltan env vars de Supabase");
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() valida el JWT y refresca la sesión si hace falta.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "unauthenticated");
    return NextResponse.redirect(loginUrl);
  }

  // Chequear membresía en super_admins (RLS deshabilitado en la tabla,
  // funciona con el publishable key mientras el JWT esté validado).
  const { data: superAdmin } = await supabase
    .from("super_admins" as never)
    .select("id")
    .eq("id", user.id)
    .single() as { data: { id: string } | null };

  if (!superAdmin) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "forbidden");
    // Limpiamos la cookie de sesión para no rebotar en loop.
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete("sb-" + url.split(".")[0].split("//")[1] + "-auth-token");
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
