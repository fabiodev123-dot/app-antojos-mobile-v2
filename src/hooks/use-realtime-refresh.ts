"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const DEBOUNCE_MS = 800;

/**
 * Suscribe a cambios realtime en una o más tablas de Supabase.
 * Cuando hay un INSERT/UPDATE/DELETE, llama `router.refresh()` pero
 * con debounce: si llegan 5 eventos en 100ms, solo se refresca UNA vez.
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.refresh();
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    const channel = supabase.channel("admin-monitor-realtime");

    const tableList = tablesKey.split(",").filter(Boolean);
    for (const table of tableList) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          debouncedRefresh();
        },
      );
    }
    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedRefresh, tablesKey]);
}
