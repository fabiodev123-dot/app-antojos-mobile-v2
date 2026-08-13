"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Zap, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PedidoNewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Action sheet que aparece al tocar el "+" del bottom-nav.
 *
 * Dos opciones:
 * - Pegar pedido de WhatsApp (con parser + extracción de cliente)
 * - Pedido Rápido (anónimo, sin parser)
 */
export function PedidoNewSheet({ open, onOpenChange }: PedidoNewSheetProps) {
  const router = useRouter();

  function go(mode: "wsp" | "rapido") {
    onOpenChange(false);
    router.push(`/pedidos/nuevo?mode=${mode}`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl border-t border-x-0 border-b-0 sm:max-w-md sm:mx-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base">¿Cómo querés cargar el pedido?</SheetTitle>
          <SheetDescription className="text-xs">
            Elegí el modo que se ajusta al pedido que acabás de recibir.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => go("wsp")}
            className="group flex w-full items-center gap-3 rounded-xl border border-brand/40 bg-gradient-to-br from-brand/10 to-secondary/5 p-3 text-left transition-all hover:border-brand hover:brand-glow"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-secondary text-primary-foreground brand-glow">
              <MessageSquare className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                Pegar pedido de WhatsApp
              </p>
              <p className="text-xs text-muted-foreground">
                Pegá el mensaje, detectamos productos y el cliente.
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => go("rapido")}
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover-lift"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Zap className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Pedido Rápido</p>
              <p className="text-xs text-muted-foreground">
                Sin cliente, directo al carrito.
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}