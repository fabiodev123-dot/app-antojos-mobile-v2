/**
 * Cliente Supabase para componentes del browser.
 *
 * Usa `@supabase/ssr` para manejar cookies correctamente (necesario si en el
 * futuro se agrega auth). Por ahora, single-user con anon key.
 *
 * Las vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se
 * exponen al bundle del cliente automáticamente (prefijo NEXT_PUBLIC_).
 *
 * NO importes esto desde código server-side — usá `@/lib/supabase/server` en su lugar.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[supabase/client] Faltan env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Configuralas en .env.local (dev) o en Vercel → Settings → Environment Variables (prod).",
    );
  }

  return createBrowserClient(url, anonKey);
}