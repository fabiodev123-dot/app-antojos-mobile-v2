"use client";

import { useState } from "react";
import {
  ChevronRight,
  Loader2,
  Trash2,
  Phone,
  MapPin,
  Truck,
  Store,
  StickyNote,
  CheckCircle2,
  Clock,
  ChefHat,
  Package,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  deletePedido,
  transitionPedidoEstado,
} from "@/lib/services/pedido-service";
import { nowIso } from "@/lib/repositories/types";
import { ColorStripe } from "@/components/features/color-badge";
import { formatHora, formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstadoPedido, Pedido } from "@/lib/types";
import { toast } from "sonner";

interface PedidoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: Pedido | null;
}

const ESTADOS_SIGUIENTES: Array<{ estado: EstadoPedido; label: string; icon: typeof CheckCircle2; className: string }> = [
  { estado: "preparando", label: "Pasar a cocina", icon: ChefHat, className: "bg-gradient-to-br from-brand to-secondary text-primary-foreground hover:brightness-110" },
  { estado: "listo", label: "Marcar como listo", icon: Package, className: "bg-gradient-to-br from-brand to-secondary text-primary-foreground hover:brightness-110" },
  { estado: "entregado", label: "Marcar como entregado", icon: CheckCircle2, className: "bg-success text-success-foreground hover:brightness-110" },
];

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  preparando: "En cocina",
  listo: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ESTADO_BADGE: Record<EstadoPedido, string> = {
  pendiente: "bg-warning/15 text-warning ring-1 ring-warning/30",
  preparando: "bg-info/20 text-info-foreground ring-1 ring-info/40",
  listo: "bg-success/15 text-success ring-1 ring-success/30",
  entregado: "bg-muted text-muted-foreground ring-1 ring-border",
  cancelado: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
};

export function PedidoDetailDialog({ open, onOpenChange, pedido }: PedidoDetailDialogProps) {
  const [updating, setUpdating] = useState<EstadoPedido | null>(null);

  if (!pedido) return null;

  function cambiarEstado(nuevoEstado: EstadoPedido) {
    if (!pedido) return;
    setUpdating(nuevoEstado);
    const extras: Partial<Pedido> = {};
    if (nuevoEstado === "entregado") {
      extras.entregadoAt = nowIso();
      extras.cerradoAt = nowIso();
    } else if (nuevoEstado === "listo" || nuevoEstado === "cancelado") {
      extras.cerradoAt = nowIso();
    }
    transitionPedidoEstado(pedido.id, nuevoEstado, extras);
    toast.success(`Pedido #${pedido.numero} → ${ESTADO_LABEL[nuevoEstado]}`);
    setTimeout(() => {
      setUpdating(null);
      onOpenChange(false);
    }, 400);
  }

  function cancelar() {
    if (!pedido) return;
    if (!confirm(`¿Cancelar el pedido #${pedido.numero}?`)) return;
    cambiarEstado("cancelado");
  }

  function eliminar() {
    if (!pedido) return;
    if (!confirm(`¿Eliminar el pedido #${pedido.numero}? No se puede deshacer.`)) return;
    deletePedido(pedido.id);
    toast.success(`Pedido #${pedido.numero} eliminado`);
    onOpenChange(false);
  }

  const siguientes = ESTADOS_SIGUIENTES.filter((e) => {
    if (pedido.estado === "pendiente") return e.estado === "preparando";
    if (pedido.estado === "preparando") return e.estado === "listo";
    if (pedido.estado === "listo") return e.estado === "entregado";
    return false;
  });

  const esCerrado = pedido.estado === "entregado" || pedido.estado === "cancelado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground text-base">#{pedido.numero}</span>
              <span>{pedido.nombreCliente}</span>
            </DialogTitle>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                ESTADO_BADGE[pedido.estado],
              )}
            >
              {ESTADO_LABEL[pedido.estado]}
            </span>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>{formatHora(pedido.hora)} · {pedido.fecha}</span>
            <span>
              {pedido.canal === "whatsapp" ? "📱 WhatsApp" : pedido.canal === "presencial" ? "🖥️ Carga local" : "📞 Teléfono"}
            </span>
            <span className="inline-flex items-center gap-1">
              {pedido.tipoEntrega === "delivery" ? <Truck className="size-3" /> : <Store className="size-3" />}
              {pedido.tipoEntrega === "delivery" ? "Delivery" : "Retiro"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(pedido.telefonoCliente || pedido.direccionEntrega || pedido.observaciones) ? (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              {pedido.telefonoCliente ? (
                <a
                  href={`https://wa.me/${pedido.telefonoCliente.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-success hover:underline"
                >
                  <Phone className="size-3.5" />
                  {pedido.telefonoCliente}
                </a>
              ) : null}
              {pedido.direccionEntrega ? (
                <p className="flex items-start gap-1.5">
                  <MapPin className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>{pedido.direccionEntrega}</span>
                </p>
              ) : null}
              {pedido.observaciones ? (
                <p className="flex items-start gap-1.5 text-warning">
                  <StickyNote className="size-3.5 mt-0.5 shrink-0" />
                  <span>{pedido.observaciones}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Items ({pedido.items.length})
            </p>
            <div className="space-y-2">
              {pedido.items.map((it) => (
                <div key={it.id} className="flex items-stretch gap-0 overflow-hidden rounded-lg border border-border">
                  <ColorStripe color={it.colorProducto} className="rounded-none" />
                  <div className="flex flex-1 items-center justify-between gap-2 p-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {it.imagenProducto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.imagenProducto}
                          alt={it.nombreProducto}
                          loading="lazy"
                          className="size-10 shrink-0 rounded-lg bg-muted object-cover ring-1 ring-white/15 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          <span className="font-mono text-muted-foreground mr-1">{it.cantidad}×</span>
                          {it.nombreProducto}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatPrecio(it.precioUnitario)} c/u
                        </p>
                      </div>
                    </div>
                    <span className="font-heading text-sm font-semibold tabular-nums">
                      {formatPrecio(it.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrecio(pedido.subtotal)}</span>
            </div>
            {pedido.envio && pedido.envio > 0 ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Truck className="size-3" /> Envío
                </span>
                <span className="tabular-nums">{formatPrecio(pedido.envio)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
              <span className="text-sm font-medium">Total</span>
              <span className="font-heading text-xl font-bold tabular-nums">
                {formatPrecio(pedido.total)}
              </span>
            </div>
          </div>

          {pedido.entregadoAt ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              Entregado el {new Date(pedido.entregadoAt).toLocaleString("es-AR")}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!esCerrado ? (
            <div className="flex w-full flex-col gap-2">
              {siguientes.map((s) => {
                const Icon = s.icon;
                return (
                  <Button
                    key={s.estado}
                    onClick={() => cambiarEstado(s.estado)}
                    disabled={updating !== null}
                    className={cn("w-full", s.className)}
                  >
                    {updating === s.estado ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                    {s.label}
                    <ChevronRight className="size-4 ml-auto opacity-50" />
                  </Button>
                );
              })}
              {pedido.estado !== "cancelado" ? (
                <Button
                  variant="outline"
                  onClick={cancelar}
                  disabled={updating !== null}
                  className="w-full text-destructive hover:bg-destructive/10"
                >
                  <X className="size-4" />
                  Cancelar pedido
                </Button>
              ) : null}
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={eliminar}
              className="w-full"
            >
              <Trash2 className="size-4" />
              Eliminar pedido
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}