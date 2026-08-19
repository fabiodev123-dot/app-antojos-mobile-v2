"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Suscribe a cambios realtime en una o más tablas de Supabase.
 * Cuando hay un INSERT/UPDATE/DELETE, llama `router.refresh()` para que los
 * Server Components re-fetchen la data y la UI se actualice sin F5.
 *
 * Requiere que la tabla tenga REPLICA IDENTITY FULL o un PK (Supabase Realtime
 * usa WAL para detectar cambios; las tablas del repo lo tienen).
 *
 * NO usar en el admin: el admin lee con service_role desde el server, no del
 * browser. Esto es SOLO para el panel admin que se renderiza como client
 * component pero necesita refresh en vivo.
 */
export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter();
  const tablesKey = tables.join(",");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    const channel = supabase.channel("admin-monitor-realtime");

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          router.refresh();
        },
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, tablesKey]);
}