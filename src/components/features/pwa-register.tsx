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
        // Patrón oficial Next.js 16 + Turbopack (ver docs/01-app/02-guides/progressive-web-apps.mdx).
        // NO usar extensión en el path — Turbopack resuelve y compila desde src/lib/.
        // NO usar type: "module" — los service workers no son ES modules por default.
        // Usamos una variable (no string literal) para que el resolver estático del bundler
        // no intente resolver el archivo como un módulo regular — el SW es código especial.
        const swPath = "../lib/pwa";
        const registration = await navigator.serviceWorker.register(
          new URL(swPath, import.meta.url),
          { scope: "/", updateViaCache: "none" },
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