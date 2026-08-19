"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { VentaRapidaSheet } from "@/components/features/venta-rapida-sheet";
import { cn } from "@/lib/utils";

/**
 * FAB (Floating Action Button) persistente para abrir el sheet de
 * venta rápida. Posicionado bottom-right, encima del BottomNav.
 *
 * Mobile-first: tamaño generoso para tap-friendly. Color brand (amarillo)
 * para destacar y ser descubrible, igual que el botón "+" central del nav
 * pero sin canibalizar el flujo de "nuevo pedido".
 */
export function VentaRapidaFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Anotar venta rápida"
        className={cn(
          "fixed z-40 bottom-[calc(5rem+env(safe-area-inset-bottom)+0.75rem)] right-4",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary to-secondary text-primary-foreground",
          "shadow-[0_8px_24px_-6px_rgba(255,204,0,0.6)]",
          "hover:scale-105 active:scale-95 transition-transform",
          "border-2 border-primary-foreground/20",
        )}
      >
        <Zap className="size-6" />
      </button>
      <VentaRapidaSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
