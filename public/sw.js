/* Service Worker Antojos — estrategias por tipo de recurso.
 *
 * - HTML/navegación: network-first (fallback cache)
 * - Assets estáticos (JS/CSS/fonts): cache-first (viven mucho)
 * - API data (/api/*): network-only (nunca cache, o stale-while-revalidate)
 * - Imágenes: cache-first con network fallback
 *
 * Ubicado en /public/sw.js — Next.js 16 + Turbopack no compila .ts como SW.
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `antojos-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `antojos-dynamic-${CACHE_VERSION}`;

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
      const cache = await caches.open(STATIC_CACHE);
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
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|ico|webmanifest)$/.test(url.pathname);
}

function isImage(url) {
  return /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ── API: network-only ──────────────────────────────────────────────────────
  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Assets estáticos: cache-first ──────────────────────────────────────────
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })(),
    );
    return;
  }

  // ── Imágenes: cache-first con network fallback ─────────────────────────────
  if (isImage(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          return new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  // ── HTML/navegación: network-first ─────────────────────────────────────────
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Response("Offline", { status: 503 });
      }
    })(),
  );
});
