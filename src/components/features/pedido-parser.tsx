"use client";

import { useState, useTransition } from "react";
import {
  ClipboardPaste,
  Sparkles,
  AlertTriangle,
  X,
  Loader2,
  User,
  StickyNote,
  ShoppingBag,
  Truck,
  Store,
} from "lucide-react";
import type { Producto, TipoEntrega } from "@/lib/types";
import { parsePedidoText, type ParseResult, type ParsedItem } from "@/lib/parse/pedido-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrecio } from "@/lib/format";

interface PedidoParserProps {
  productos: Producto[];
  categorias?: { id: string; nombre: string; emoji?: string }[];
  /** Carga los items al carrito (modo manual). */
  onAccept: (items: Array<{ producto: Producto; cantidad: number }>, nombreCliente: string) => void;
  /**
   * El usuario quiere confirmar el pedido desde el parser.
   * El padre abre el `ConfirmarPedidoModal` con la modalidad detectada del texto.
   */
  onRequestConfirm: (data: {
    items: Array<{ producto: Producto; cantidad: number }>;
    nombreCliente: string;
    observaciones: string;
    tipoEntregaDetectado: TipoEntrega | null;
  }) => void;
  defaultOpen?: boolean;
}

export function PedidoParser({
  productos,
  categorias = [],
  onAccept,
  onRequestConfirm,
  defaultOpen = false,
}: PedidoParserProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleParse() {
    if (!text.trim()) {
      setResult(null);
      return;
    }
    startTransition(() => {
      setResult(parsePedidoText(text, productos, { categorias }));
    });
  }

  function handleAccept() {
    if (!result) return;
    const items = result.matched
      .filter((i) => i.matched !== null)
      .map((i) => ({ producto: i.matched as Producto, cantidad: i.cantidad }));
    onAccept(items, result.nombreCliente);
    setText("");
    setResult(null);
    setOpen(false);
  }

  function handleConfirm() {
    if (!result) return;
    const items = result.matched
      .filter((i) => i.matched !== null)
      .map((i) => ({ producto: i.matched as Producto, cantidad: i.cantidad }));
    onRequestConfirm({
      items,
      nombreCliente: result.nombreCliente,
      observaciones: result.observations.join(" · "),
      tipoEntregaDetectado: result.tipoEntregaDetectado,
    });
  }

  function handleClear() {
    setText("");
    setResult(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-left transition-all hover:border-brand hover:bg-brand/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand group-hover:bg-brand/25">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Pegar pedido de WhatsApp</p>
          <p className="text-xs text-muted-foreground">
            Escribí o pegá el pedido tal como te llegó. Lo desciframos solos.
          </p>
        </div>
        <ClipboardPaste className="size-4 text-muted-foreground group-hover:text-brand" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand/40 bg-brand/5 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <p className="text-sm font-medium">Pegar pedido de WhatsApp</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (result) setResult(null);
        }}
        onPaste={() => {
          setTimeout(handleParse, 0);
        }}
        placeholder={
          "Ej:\nHola María, 2 sanguches de milanesa y una coca\nPara Diego: pizza muzza sin aceitunas"
        }
        rows={5}
        className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleParse}
          disabled={pending || !text.trim()}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Parsear
        </Button>
        {text ? (
          <Button size="sm" variant="ghost" onClick={handleClear}>
            Limpiar
          </Button>
        ) : null}
      </div>

      {result ? (
        <ParserPreview
          result={result}
          onAddToCart={handleAccept}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
}

function ParserPreview({
  result,
  onAddToCart,
  onConfirm,
}: {
  result: ParseResult;
  onAddToCart: () => void;
  onConfirm: () => void;
}) {
  const totalMatched = result.matched.length;
  const totalUnmatched = result.unmatched.length;
  const total = result.matched.reduce(
    (sum, i) => sum + (i.matched?.precio ?? 0) * i.cantidad,
    0,
  );
  const observaciones = result.observations.join(" · ");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/80 p-3 backdrop-blur">
      {/* Header con cliente + total */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          {result.nombreCliente ? (
            <div className="flex items-center gap-2 text-sm">
              <User className="size-3.5 text-secondary-foreground shrink-0" />
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-semibold truncate">{result.nombreCliente}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-3.5" />
              <span className="italic">Sin cliente detectado</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="size-3" />
              {totalMatched} producto{totalMatched === 1 ? "" : "s"} detectado{totalMatched === 1 ? "" : "s"}
            </span>
            {result.tipoEntregaDetectado ? (
              <ModalidadDetectadaChip tipo={result.tipoEntregaDetectado} />
            ) : null}
          </div>
        </div>
        {totalMatched > 0 ? (
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="font-heading text-2xl font-bold tabular-nums leading-tight">
              {formatPrecio(total)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Items detectados */}
      {totalMatched > 0 ? (
        <ul className="space-y-1.5">
          {result.matched.map((item) => (
            <MatchedItemRow key={item.matched!.id} item={item} />
          ))}
        </ul>
      ) : null}

      {/* Sin matches */}
      {totalMatched === 0 && totalUnmatched === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No detecté ningún producto. Probá con otro formato.
        </p>
      ) : null}

      {/* No reconocidos */}
      {totalUnmatched > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-warning">
            No reconocí {totalUnmatched} (cargalos a mano):
          </p>
          <ul className="space-y-0.5">
            {result.unmatched.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <AlertTriangle className="size-3 text-warning shrink-0" />
                <span className="truncate text-muted-foreground">{item.raw}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Observaciones */}
      {observaciones ? (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 px-2.5 py-1.5 text-xs">
          <StickyNote className="size-3 text-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-warning">Observaciones:</span>{" "}
            <span className="text-foreground/80">{observaciones}</span>
          </div>
        </div>
      ) : null}

      {/* CTAs */}
      {totalMatched > 0 ? (
        <div className="space-y-2 pt-1">
          <Button
            size="lg"
            onClick={onConfirm}
            className="w-full bg-gradient-to-br from-brand to-secondary text-primary-foreground hover:brightness-110 brand-glow border-0"
          >
            <Sparkles className="size-4" />
            {result.nombreCliente
              ? `Confirmar pedido para ${result.nombreCliente}`
              : "Confirmar pedido"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddToCart}
            className="w-full text-muted-foreground"
          >
            O agregar al carrito para editar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ModalidadDetectadaChip({ tipo }: { tipo: TipoEntrega }) {
  const Icon = tipo === "delivery" ? Truck : Store;
  const label = tipo === "delivery" ? "Delivery" : "Retiro";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        tipo === "delivery"
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-secondary/40 bg-secondary/10 text-secondary-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label} detectado
    </span>
  );
}

function MatchedItemRow({ item }: { item: ParsedItem }) {
  const product = item.matched!;
  const lowConfidence = item.score < 0.7;
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="font-mono font-semibold tabular-nums text-foreground bg-muted rounded px-1.5 py-0.5 min-w-7 text-center">
        {item.cantidad}×
      </span>
      {product.imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imagen}
          alt=""
          aria-hidden
          className="size-6 shrink-0 rounded-md bg-muted object-cover ring-1 ring-white/15 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
        />
      ) : null}
      <span className={cn("truncate", lowConfidence && "text-warning")}>
        {product.nombre}
      </span>
      <span className="ml-auto shrink-0 font-mono tabular-nums font-medium">
        ${(product.precio * item.cantidad).toLocaleString("es-AR")}
      </span>
    </li>
  );
}