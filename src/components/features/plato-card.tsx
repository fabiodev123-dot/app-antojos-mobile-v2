import { useRef, useState } from "react";
import { Minus, Plus, Pencil } from "lucide-react";
import type { Producto } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ColorStripe } from "@/components/features/color-badge";
import { cn } from "@/lib/utils";

interface PlatoCardAdmin {
  onNombreChange?: (value: string) => void;
  onPrecioChange?: (value: number) => void;
  onStockChange?: (delta: number) => void;
}

export function PlatoCard({
  producto,
  trailing,
  onClick,
  className,
  showStock = false,
  admin,
}: {
  producto: Producto;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  showStock?: boolean;
  /**
   * Si está presente, habilita edición inline de nombre y precio (un click
   * en el texto lo convierte en input) y un stepper +/- para stockActual.
   * Diseñado para la pantalla de admin de productos.
   */
  admin?: PlatoCardAdmin;
}) {
  const Comp = onClick ? "button" : "div";
  const lowStock = producto.stockActual <= producto.stockMinimo;
  const noStock = producto.stockActual === 0;
  const hasMedia = Boolean(producto.imagen) || Boolean(producto.emoji);

  const isAdmin = !!admin;
  const disableCardClick = isAdmin; // En admin el click no abre nada (los inputs manejan su propio click)

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <Comp
        type={onClick && !disableCardClick ? "button" : undefined}
        onClick={disableCardClick ? undefined : onClick}
        className={cn(
          "flex w-full items-stretch gap-0 text-left",
          onClick && !disableCardClick && "cursor-pointer transition-colors hover:bg-muted/50",
          noStock && "opacity-60",
        )}
      >
        <ColorStripe color={producto.color} className="rounded-none" />
        <CardContent className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2 pr-3 sm:pr-4">
          {hasMedia ? (
            <div className="shrink-0">
              {producto.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={producto.imagen}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="size-10 rounded-md object-cover ring-1 ring-white/15 bg-muted shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)] sm:size-12"
                />
              ) : producto.emoji ? (
                <span className="grid size-10 place-items-center rounded-md bg-muted text-lg sm:size-12 sm:text-xl">
                  {producto.emoji}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {isAdmin && admin?.onNombreChange ? (
              <InlineText
                value={producto.nombre}
                onChange={admin.onNombreChange}
                placeholder="Nombre del plato"
                className="text-sm font-medium leading-tight"
              />
            ) : (
              <p className="truncate text-sm font-medium leading-tight">{producto.nombre}</p>
            )}
            {producto.descripcion ? (
              <p className="truncate text-xs text-muted-foreground">{producto.descripcion}</p>
            ) : null}
            {showStock ? (
              <div className="flex items-center gap-1.5">
                {isAdmin && admin?.onStockChange ? (
                  <StockStepper
                    value={producto.stockActual}
                    min={0}
                    onDelta={admin.onStockChange}
                    className="shrink-0"
                  />
                ) : (
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      noStock
                        ? "text-destructive font-medium"
                        : lowStock
                          ? "text-warning font-medium"
                          : "text-muted-foreground",
                    )}
                  >
                    Stock: {producto.stockActual}
                    {producto.stockMinimo > 0 ? (
                      <span className="text-muted-foreground/70">
                        {" "}
                        (mín {producto.stockMinimo})
                      </span>
                    ) : null}
                  </span>
                )}
                {isAdmin && admin?.onStockChange ? (
                  <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                    / mín {producto.stockMinimo}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            {isAdmin && admin?.onPrecioChange ? (
              <InlinePrice
                value={producto.precio}
                onChange={admin.onPrecioChange}
                className="font-heading text-sm font-semibold tabular-nums leading-none sm:text-base"
              />
            ) : (
              <span className="font-heading text-sm font-semibold tabular-nums leading-none sm:text-base">
                ${producto.precio.toLocaleString("es-AR")}
              </span>
            )}
            {trailing}
          </div>
        </CardContent>
      </Comp>
    </Card>
  );
}

/**
 * Texto que se vuelve input al click. Enter guarda, Esc cancela, blur guarda.
 * Usado para edición inline de nombre y precio.
 */
function InlineText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className={cn(
          "group/name -mx-1 flex min-w-0 items-center gap-1 truncate rounded px-1 text-left transition-colors hover:bg-muted/60",
          className,
        )}
        aria-label={`Editar nombre: ${value}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/name:opacity-100" />
      </button>
    );
  }

  return (
    <TextEditor
      key={value}
      initialValue={value}
      onCommit={(v) => {
        const trimmed = v.trim();
        if (trimmed && trimmed !== value) onChange(trimmed);
        setEditing(false);
      }}
      onCancel={() => setEditing(false)}
      placeholder={placeholder}
      className={className}
    />
  );
}

function TextEditor({
  initialValue,
  onCommit,
  onCancel,
  placeholder,
  className,
}: {
  initialValue: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus en mount (no useEffect necesario: usamos callback ref).
  const setRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (el) {
      el.focus();
      el.select();
    }
  };

  return (
    <input
      ref={setRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(draft);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      placeholder={placeholder}
      className={cn(
        "w-full min-w-0 rounded-md border border-brand/60 bg-background px-1.5 py-0.5 outline-none ring-2 ring-brand/30",
        className,
      )}
    />
  );
}

/** Variante de InlineText especializada para precio (Input numérico). */
function InlinePrice({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className={cn(
          "group/price -mx-1 inline-flex items-center gap-1 rounded px-1 transition-colors hover:bg-muted/60",
          className,
        )}
        aria-label={`Editar precio: $${value.toLocaleString("es-AR")}`}
      >
        <span>${value.toLocaleString("es-AR")}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/price:opacity-100" />
      </button>
    );
  }

  return (
    <PriceEditor
      key={value}
      initialValue={value}
      onCommit={(v) => {
        if (v !== value) onChange(v);
        setEditing(false);
      }}
      onCancel={() => setEditing(false)}
      className={className}
    />
  );
}

function PriceEditor({
  initialValue,
  onCommit,
  onCancel,
  className,
}: {
  initialValue: number;
  onCommit: (v: number) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(initialValue.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const setRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (el) {
      el.focus();
      el.select();
    }
  };

  function commit() {
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n) && n >= 0) onCommit(n);
    else onCancel();
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-brand/60 bg-background px-1.5 py-0.5 ring-2 ring-brand/30",
        className,
      )}
    >
      <span className="mr-0.5 text-muted-foreground">$</span>
      <input
        ref={setRef}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className="w-20 min-w-0 bg-transparent outline-none tabular-nums"
        aria-label="Editar precio"
      />
    </span>
  );
}

/** Stepper +/- compacto para stockActual. */
function StockStepper({
  value,
  min,
  max,
  onDelta,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onDelta: (delta: number) => void;
  className?: string;
}) {
  const canDec = min === undefined ? true : value > min;
  const canInc = max === undefined ? true : value < max;
  const lowStock = min !== undefined && value <= min;
  const noStock = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-background/60 p-0.5",
        className,
      )}
      role="group"
      aria-label="Ajustar stock"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canDec) onDelta(-1);
        }}
        disabled={!canDec}
        className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        aria-label="Restar 1 al stock"
      >
        <Minus className="size-3" />
      </button>
      <span
        className={cn(
          "min-w-7 px-1 text-center font-mono text-[11px] tabular-nums",
          noStock
            ? "text-destructive font-semibold"
            : lowStock
              ? "text-warning font-semibold"
              : "text-foreground",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canInc) onDelta(1);
        }}
        disabled={!canInc}
        className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        aria-label="Sumar 1 al stock"
      >
        <Plus className="size-3" />
      </button>
    </span>
  );
}