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
        // Patrón clásico y robusto: SW estático en /public/sw.js.
        // Next.js 16 + Turbopack no compila archivos .ts como service workers
        // en producción — el SW debe ser JS plano servible desde /public/.
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
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