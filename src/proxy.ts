/**
 * Proxy (ex-middleware en Next.js 16) — protege toda la app autenticada.
 *
 * - /admin/* requiere ser super admin (redirige a /login si no).
 * - /, /pedidos, /productos, etc. requieren session (cualquier user autenticado).
 * - /login, /admin/login, /api/*, assets: pasan sin chequeo.
 *
 * Las API routes (/api/db/*, /api/devices/*, etc.) tienen su propio
 * requireSession() en cada handler — el proxy solo redirige para rutas
 * de page, no para fetch.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PAGE_PATHS = ["/login", "/admin/login"];
const PUBLIC_API_PREFIXES = ["/api/"];
const PUBLIC_ASSET_PREFIXES = ["/_next/", "/favicon"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.includes(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_ASSET_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[proxy] Faltan env vars de Supabase");
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "unauthenticated");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    const { data: superAdmin } = await supabase
      .from("super_admins" as never)
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!superAdmin) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "forbidden");
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete(
        "sb-" + url.split(".")[0].split("//")[1] + "-auth-token",
      );
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
