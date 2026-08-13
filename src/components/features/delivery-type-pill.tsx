"use client";

import { Truck, Store } from "lucide-react";

import type { TipoEntrega } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeliveryTypePillProps {
  value: TipoEntrega;
  onChange: (value: TipoEntrega) => void;
  className?: string;
  /**
   * "sm" → pensado para vivir en la barra flotante junto al total y el CTA.
   *         Padding mínimo para caber en pantallas de 320px.
   * "md" → tamaño por defecto, útil en otros contextos.
   */
  size?: "sm" | "md";
}

/**
 * Versión compacta del toggle para usar dentro de la barra flotante de resumen.
 * Mismo control accesible (radiogroup), solo que con menos padding y pensado
 * para vivir al lado del total.
 */
export function DeliveryTypePill({
  value,
  onChange,
  className,
  size = "md",
}: DeliveryTypePillProps) {
  const isCompact = size === "sm";
  return (
    <div
      role="radiogroup"
      aria-label="Modalidad de entrega"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border bg-muted/60",
        isCompact ? "gap-0.5 p-0.5" : "gap-1 p-1",
        className,
      )}
    >
      <PillButton
        active={value === "delivery"}
        label="Delivery"
        onClick={() => onChange("delivery")}
        compact={isCompact}
      >
        <Truck className="size-3" aria-hidden />
      </PillButton>
      <PillButton
        active={value === "retiro"}
        label="Retiro"
        onClick={() => onChange("retiro")}
        compact={isCompact}
      >
        <Store className="size-3" aria-hidden />
      </PillButton>
    </div>
  );
}

function PillButton({
  active,
  label,
  onClick,
  compact,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        "transition-all duration-300 ease-out outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/60",
        compact
          ? "gap-0.5 px-2 py-0.5 text-[11px] leading-none"
          : "gap-1 px-2.5 py-1 text-xs",
        active
          ? "bg-brand text-brand-foreground brand-glow"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}