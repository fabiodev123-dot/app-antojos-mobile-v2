"use client";

import { MessageSquare } from "lucide-react";

const WHATSAPP_NUMEROS = [
  { digits: "543704087573" },
];

function waLink(digits: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent("¡Hola Antojos! Quiero hacer un pedido 🍕")}`;
}

/**
 * Barra CTA fija en mobile (solo visible en pantallas pequeñas).
 * Se oculta en desktop donde el header ya tiene el botón de WhatsApp.
 */
export function StickyCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl safe-area-pb sm:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <a
          href="#carta"
          className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-white/5 hover:border-white/25 active:scale-[0.97]"
        >
          Ver la carta
        </a>
        <a
          href={waLink(WHATSAPP_NUMEROS[0].digits)}
          target="_blank"
          rel="noopener noreferrer"
          className="gold-sweep flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-bold tracking-tight text-brand-foreground shadow-lg shadow-brand/30 transition-all duration-200 hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/35 active:scale-[0.97]"
        >
          <MessageSquare className="size-4" />
          Pedir por WhatsApp
        </a>
      </div>
    </div>
  );
}
