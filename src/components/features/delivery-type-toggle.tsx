"use client";

import { Truck, Store, MapPin } from "lucide-react";

import type { TipoEntrega } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeliveryTypeToggleProps {
  value: TipoEntrega;
  onChange: (value: TipoEntrega) => void;
  className?: string;
}

const OPTIONS: Array<{
  value: TipoEntrega;
  label: string;
  hint: string;
  Icon: typeof Truck;
}> = [
  { value: "delivery", label: "Delivery", hint: "Pedir dirección en checkout", Icon: Truck },
  { value: "retiro", label: "Retiro", hint: "Mostrador del local", Icon: Store },
];

export function DeliveryTypeToggle({ value, onChange, className }: DeliveryTypeToggleProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="radiogroup"
        aria-label="Modalidad de entrega"
        className="relative inline-flex w-full items-center rounded-xl border border-border bg-muted/40 p-1"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.label}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                "transition-all duration-300 ease-out outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/60",
                active
                  ? "bg-brand text-brand-foreground brand-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <opt.Icon className="size-4" aria-hidden />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
      <p
        className={cn(
          "flex items-center gap-1.5 text-[11px] leading-tight transition-colors duration-300",
          value === "delivery" ? "text-brand" : "text-muted-foreground",
        )}
      >
        {value === "delivery" ? (
          <>
            <MapPin className="size-3" aria-hidden />
            Te vamos a pedir la dirección en el siguiente paso
          </>
        ) : (
          <>
            <Store className="size-3" aria-hidden />
            Pasás a retirar por el mostrador del local
          </>
        )}
      </p>
    </div>
  );
}