"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de PWA al montar el cliente.
 *
 * Next.js 16 compila `src/lib/pwa.ts` y lo sirve desde
 * `/_next/static/service-worker/`. El patrón `new URL(..., import.meta.url)`
 * es la forma oficial (ver docs de Next.js 16 + Turbopack).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Solo registrar en producción para no romper el dev server
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          new URL("../lib/pwa.ts", import.meta.url),
          { scope: "/", type: "module" },
        );
        // Forzar update cada vez que se carga la app (en prod)
        registration.update().catch(() => {
          // ignore
        });
      } catch (err) {
        console.warn("[PWA] No se pudo registrar el service worker:", err);
      }
    };

    register();
  }, []);

  return null;
}