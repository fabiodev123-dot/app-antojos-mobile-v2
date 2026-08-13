import type { MetadataRoute } from "next";

/**
 * PWA manifest de Antojos.
 *
 * Next.js 16 sirve este archivo automáticamente desde /manifest.webmanifest
 * (ver docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.mdx).
 *
 * El "display: standalone" hace que cuando el usuario instale la app desde el
 * celular se abra SIN barra de Chrome — como si fuera nativa.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antojos — Rotisería",
    short_name: "Antojos",
    description:
      "Panel de gestión para la rotisería Antojos: pedidos, stock, clientes y cierre diario.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121212",
    theme_color: "#FF6600",
    categories: ["business", "productivity", "food"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}