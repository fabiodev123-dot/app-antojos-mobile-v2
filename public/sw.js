/* Service Worker Antojos — estrategia network-first con cache fallback.
 *
 * Ubicado en /public/sw.js (no en src/lib/) porque Next.js 16 + Turbopack
 * no compila archivos .ts como service workers en producción — ver issue.
 * El patrón src/lib/*.ts funciona en Webpack pero no en Turbopack builds.
 */

const CACHE_NAME = "antojos-v1";
const APP_SHELL = [
  "/",
  "/pedidos",
  "/productos",
  "/stock",
  "/cierre",
  "/clientes",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Best-effort: no fallar el install si una ruta todavía no existe
      await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Solo same-origin. Terceros (fonts, imágenes externas) los maneja el browser.
  if (url.origin !== self.location.origin) return;

  // Network-first, cache fallback
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // Solo cachear respuestas válidas (200/206)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          // Clone porque la respuesta original se consume al retornar
          cache.put(request, response.clone()).catch(() => {
            // Ignorar errores de quota — no es crítico
          });
        }
        return response;
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Sin cache Y sin red: devolver error
        throw err;
      }
    })(),
  );
});