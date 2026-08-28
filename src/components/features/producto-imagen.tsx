"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Imagen de producto con fallback defensivo.
 *
 * Si `src` está presente y carga OK → muestra el <img>.
 * Si `src` es null/undefined O falla al cargar (404, corrupto) → cae a un
 * box con el emoji del producto (o 🍽️ por defecto). Nunca se ve la
 * "imagen rota" del browser.
 *
 * `fallback` permite un nodo custom (ej: la barra de estado en home-content).
 */
export function ProductoImagen({
  src,
  emoji,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  emoji?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);

  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        aria-hidden={alt === ""}
        loading="lazy"
        onError={() => setErrored(true)}
        className={cn(className)}
      />
    );
  }

  if (fallback) return <>{fallback}</>;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md bg-muted text-lg ring-1 ring-border",
        className,
      )}
      aria-hidden
    >
      {emoji || "🍽️"}
    </span>
  );
}
