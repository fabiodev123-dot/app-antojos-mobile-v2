/**
 * Middleware de autenticación con @supabase/ssr para Next.js App Router.
 *
 * - Refresca tokens de sesión expirados en cada request.
 * - Protege todas las rutas bajo `/` excepto `/` (landing), `/login`, `/admin/login`, `/api/debug/*` y assets estáticos.
 * - Rutas `/admin/*` requieren además ser super admin (redirige a /login con razón forbidden si no).
 * - En peticiones a `/api/*` sin sesión retorna 401 JSON.
 * - En peticiones de página sin sesión redirige a `/login?reason=unauthenticated`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PAGE_PATHS = ["/", "/login", "/admin/login"];
const PUBLIC_API_PREFIXES = ["/api/debug/"];
const PUBLIC_ASSET_PREFIXES = ["/_next/", "/favicon.ico", "/manifest.webmanifest"];

function isPublicPath(pathname: string): boolean {
  // / y /login son públicos, pero / se maneja aparte para redirect de user logueado
  if (pathname === "/login" || pathname === "/admin/login") return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_ASSET_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  // La landing (/) es pública para todos, pero si el usuario está logueado
  // lo mandamos al dashboard para que vea sus pedidos/métricas.
  // Si viene con ?public=1 (botón Landing del header), no redirigimos.
  if (pathname === "/" && !request.nextUrl.searchParams.has("public")) {
    let response = NextResponse.next({ request });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (url && key) {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(new URL("/home", request.url));
      }
    }
    return response;
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "unauthenticated");
    return NextResponse.redirect(loginUrl);
  }

  // Protección para rutas /admin/* (excepto /admin/login que ya fue filtrada como pública)
  if (pathname.startsWith("/admin")) {
    const { data: superAdmin } = await supabase
      .from("super_admins" as never)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle() as { data: { id: string } | null };

    if (!superAdmin) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "forbidden");
      const redirectResponse = NextResponse.redirect(loginUrl);
      const projectRef = url.split(".")[0]?.split("//")[1];
      if (projectRef) {
        redirectResponse.cookies.delete(`sb-${projectRef}-auth-token`);
      }
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
