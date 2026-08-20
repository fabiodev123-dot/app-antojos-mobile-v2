"use client";

import { useEffect, useState } from "react";

function formatTimeAgo(iso: string, nowMs: number): string {
  const ms = nowMs - new Date(iso).getTime();
  if (ms < 60_000) return "ahora";
  if (ms < 3_600_000) return `hace ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.floor(ms / 3_600_000)} h`;
  return `hace ${Math.floor(ms / 86_400_000)} d`;
}

/**
 * Devuelve un string "hace X min/h/d" relativo a `iso`. El primer render
 * retorna string vacío para evitar hydration mismatch; después de mount
 * se actualiza con el tiempo real. Refresca cada 60s.
 */
export function useTimeAgo(iso: string): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      setLabel(formatTimeAgo(iso, Date.now()));
    }
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [iso]);

  return label;
}