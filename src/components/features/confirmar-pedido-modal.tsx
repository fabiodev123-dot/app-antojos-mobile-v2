"use client";

import { useId } from "react";
import {
  User,
  ShoppingBag,
  MapPin,
  Phone,
  Loader2,
  Banknote,
} from "lucide-react";

import { DeliveryTypeToggle } from "@/components/features/delivery-type-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TipoEntrega } from "@/lib/types";

export interface ConfirmarItem {
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  imagen?: string;
  /**
   * Solo se usa internamente para reconstruir el PedidoItem.
   * El modal no lo muestra. Cuando viene del parser puede ser `""` ya que el
   * pedido-parser original no siempre persiste el id del producto.
   */
  productoId?: string;
  colorProducto?: import("@/lib/types").ColorPlato;
}

interface ConfirmarPedidoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ConfirmarItem[];
  /** Nombre actual del cliente (puede estar vacío si es Pedido Rápido). */
  nombreCliente: string;
  /** Handler para editar el nombre del cliente (opcional). */
  onNombreClienteChange: (value: string) => void;
  /** Modalidad controlada por el padre. */
  tipoEntrega: TipoEntrega;
  onTipoEntregaChange: (value: TipoEntrega) => void;
  telefono: string;
  onTelefonoChange: (value: string) => void;
  direccion: string;
  onDireccionChange: (value: string) => void;
  /**
   * Costo de envío en pesos (string para permitir edición libre).
   * Solo se aplica cuando `tipoEntrega === "delivery"`.
   * Opcional: vacío = sin costo extra.
   */
  costoDelivery: string;
  onCostoDeliveryChange: (value: string) => void;
  submitting?: boolean;
  onConfirm: (data: {
    tipoEntrega: TipoEntrega;
    nombreCliente: string;
    telefono?: string;
    direccion?: string;
    costoDelivery?: number;
  }) => void | Promise<void>;
}

/**
 * Etiqueta pequeña con asterisco que marca un campo como "opcional".
 * Reutilizable en cualquier input del modal.
 */
function OptionalBadge() {
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
      aria-label="Campo opcional"
    >
      ! opcional
    </span>
  );
}

/**
 * Valida que una dirección sea "certera": debe incluir nombre de calle
 * (alguna letra) y al menos un número, con un mínimo de 6 caracteres.
 * Rechaza cosas como "calle" (sin número) o "123" (sin nombre de calle).
 */
function esDireccionCertera(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 6) return false;
  return /[a-záéíóúñ]/i.test(trimmed) && /\d/.test(trimmed);
}

export function ConfirmarPedidoModal({
  open,
  onOpenChange,
  items,
  nombreCliente,
  onNombreClienteChange,
  tipoEntrega,
  onTipoEntregaChange,
  telefono,
  onTelefonoChange,
  direccion,
  onDireccionChange,
  costoDelivery,
  onCostoDeliveryChange,
  submitting = false,
  onConfirm,
}: ConfirmarPedidoModalProps) {
  const formId = useId();

  // Parsear costoDelivery (string -> número). Vacío o inválido = 0.
  const costoDeliveryNum = (() => {
    const n = Number(costoDelivery.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();

  const subtotal = items.reduce(
    (sum, i) => sum + i.precioUnitario * i.cantidad,
    0,
  );
  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
  const envio = tipoEntrega === "delivery" ? costoDeliveryNum : 0;
  const total = subtotal + envio;

  const canSubmit =
    items.length > 0 &&
    !submitting &&
    (tipoEntrega === "retiro" || esDireccionCertera(direccion));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm({
      tipoEntrega,
      nombreCliente: nombreCliente.trim(),
      telefono: telefono.trim() || undefined,
      direccion: tipoEntrega === "delivery" ? direccion.trim() || undefined : undefined,
      costoDelivery: tipoEntrega === "delivery" && envio > 0 ? envio : undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={!submitting}
        className="gap-0 rounded-t-2xl border-border bg-popover px-0 pb-0 shadow-2xl"
      >
        {/* Handle visual nativo mobile */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex max-h-[90vh] flex-col"
        >
          <SheetHeader className="border-b border-border/60 px-5 pb-4">
            <SheetTitle className="font-heading text-xl font-semibold tracking-tight">
              Confirmar pedido
            </SheetTitle>
            <SheetDescription className="text-xs">
              Revisá el resumen, elegí la modalidad y creá el pedido.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Nombre del cliente (editable, opcional) */}
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label
                  htmlFor={`${formId}-cliente`}
                  className="text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  Cliente
                </label>
                <OptionalBadge />
              </div>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`${formId}-cliente`}
                  value={nombreCliente}
                  onChange={(e) => onNombreClienteChange(e.target.value)}
                  placeholder='Ej: María, Diego, "Pedido de la barra 3"…'
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Si lo dejás vacío, queda como <span className="italic">Pedido Rápido</span>.
              </p>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <ShoppingBag className="size-3" aria-hidden />
                <span>
                  {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
                </span>
              </div>
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card/40">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums">
                      {item.cantidad}×
                    </span>
                    {item.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imagen}
                        alt=""
                        aria-hidden
                        className="size-8 shrink-0 rounded object-cover ring-1 ring-border"
                      />
                    ) : (
                      <span
                        className="size-8 shrink-0 rounded bg-muted ring-1 ring-border"
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.nombre}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                      {formatPrecio(item.precioUnitario * item.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Switch de modalidad */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Modalidad
              </p>
              <DeliveryTypeToggle
                value={tipoEntrega}
                onChange={onTipoEntregaChange}
              />
            </div>

            {/* Inputs de delivery */}
            <div
              className={cn(
                "grid gap-2 transition-all duration-300 ease-out",
                tipoEntrega === "delivery"
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 space-y-3 overflow-hidden">
                {/* Teléfono — OPCIONAL */}
                <div className="space-y-1.5">
                  <div className="flex items-center">
                    <label
                      htmlFor={`${formId}-telefono`}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      Teléfono
                    </label>
                    <OptionalBadge />
                  </div>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${formId}-telefono`}
                      value={telefono}
                      onChange={(e) => onTelefonoChange(e.target.value)}
                      placeholder="Ej: +54 11 5555-1234"
                      inputMode="tel"
                      autoComplete="off"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Dirección — OBLIGATORIA y certera (calle + número) */}
                <div className="space-y-1.5">
                  <div className="flex items-center">
                    <label
                      htmlFor={`${formId}-direccion`}
                      className="text-[10px] uppercase tracking-wider text-foreground"
                    >
                      Dirección de entrega
                    </label>
                    <span
                      className="ml-1.5 inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-destructive"
                      aria-label="Campo obligatorio"
                    >
                      * requerida
                    </span>
                  </div>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${formId}-direccion`}
                      value={direccion}
                      onChange={(e) => onDireccionChange(e.target.value)}
                      placeholder="Ej: Av Rivadavia 1234, 2°B"
                      autoComplete="off"
                      aria-invalid={
                        tipoEntrega === "delivery" &&
                        direccion.length > 0 &&
                        !esDireccionCertera(direccion)
                      }
                      className={cn(
                        "pl-9",
                        tipoEntrega === "delivery" &&
                          direccion.length > 0 &&
                          !esDireccionCertera(direccion) &&
                          "border-destructive focus-visible:border-destructive",
                      )}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Incluí calle y número — es lo que ve el cadete.
                  </p>
                </div>
              </div>
            </div>

            {/* Costo de envío (opcional, solo visible si delivery) */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                tipoEntrega === "delivery"
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center">
                    <label
                      htmlFor={`${formId}-envio`}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      Costo de envío
                    </label>
                    <OptionalBadge />
                  </div>
                  <div className="relative">
                    <Banknote className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${formId}-envio`}
                      type="text"
                      inputMode="decimal"
                      value={costoDelivery}
                      onChange={(e) => {
                        // Permitir solo dígitos, puntos y comas.
                        const limpio = e.target.value.replace(/[^\d.,]/g, "");
                        onCostoDeliveryChange(limpio);
                      }}
                      placeholder="Ej: 1500"
                      autoComplete="off"
                      className="pl-9 pr-12 tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      ARS
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Si lo dejás vacío, el envío no se suma al total.
                  </p>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card to-card/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>
                {envio > 0 ? (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    + {formatPrecio(envio)} envío
                  </p>
                ) : null}
              </div>
              <div className="mt-1 flex items-end justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
                <p className="font-heading text-3xl font-bold tabular-nums leading-none text-foreground">
                  {formatPrecio(total)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer con CTA */}
          <div className="border-t border-border/60 bg-popover px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="shrink-0"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit}
                className="flex-1 rounded-full bg-gradient-to-br from-brand to-secondary font-bold brand-glow text-primary-foreground hover:brightness-110 border-0 shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creando…
                  </>
                ) : (
                  <>Confirmar y crear pedido</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}