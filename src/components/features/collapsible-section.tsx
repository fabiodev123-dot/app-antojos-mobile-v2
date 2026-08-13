"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  emoji?: string;
  /** Estado inicial cuando se usa en modo no controlado. Default: expandido. */
  defaultOpen?: boolean;
  /**
   * Modo controlado. Si se pasa junto con `onOpenChange`, el componente
   * ignora su estado interno y refleja el del padre. Útil para
   * "expandir/colapsar todas" desde fuera.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Variante visual del header (default: muted gradient). */
  variant?: "default" | "warning" | "destructive";
  /**
   * Acción opcional a la derecha del header (ej: botón "+ Agregar").
   * El click en este elemento NO colapsa la sección.
   */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Sección colapsable con animación de altura suave.
 *
 * - Tap en el header (área del título/count): expande/minimiza.
 * - Chevron rota 180° cuando está expandido.
 * - `aria-expanded` para accesibilidad.
 * - Cada sección maneja su propio estado (independientes).
 *
 * Si necesitás coordinar múltiples secciones (collapse-all / accordion-only),
 * extraé el `open` al padre y pasalo por prop.
 */
export function CollapsibleSection({
  title,
  count,
  emoji,
  defaultOpen = true,
  open: openControlado,
  onOpenChange,
  variant = "default",
  trailing,
  children,
}: CollapsibleSectionProps) {
  const [interno, setInterno] = useState(defaultOpen);
  const controlado = openControlado !== undefined;
  const open = controlado ? openControlado : interno;

  function toggle() {
    if (controlado) onOpenChange?.(!open);
    else setInterno((o) => !o);
  }

  const headerBase = cn(
    "flex w-full items-center gap-2 border-b border-border/60 pl-3 text-left text-sm font-medium transition-colors",
    variant === "warning" &&
      "bg-gradient-to-r from-warning/10 to-transparent text-warning hover:from-warning/15",
    variant === "destructive" &&
      "bg-gradient-to-r from-destructive/8 to-transparent text-destructive hover:from-destructive/15",
    variant === "default" &&
      "bg-gradient-to-r from-muted/40 to-transparent hover:bg-muted/30",
  );

  const toggleAreaClass = cn(
    "flex flex-1 items-center gap-2 py-2.5 pr-2 cursor-pointer",
  );

  return (
    <Card className="overflow-hidden p-0 card-elevated">
      <div className={headerBase}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? `Contraer ${title}` : `Expandir ${title}`}
          className={toggleAreaClass}
        >
          {emoji ? <span className="text-base shrink-0">{emoji}</span> : null}
          <span className="flex-1 truncate">{title}</span>
          {count !== undefined ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                variant === "default" && "bg-muted text-muted-foreground",
                variant === "warning" && "bg-warning/20 text-warning",
                variant === "destructive" && "bg-destructive/15 text-destructive",
              )}
            >
              {count}
            </span>
          ) : null}
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {trailing ? (
          <div
            className="shrink-0 pr-2"
            onClick={(e) => e.stopPropagation()}
          >
            {trailing}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="space-y-1.5 p-2 pt-2">{children}</CardContent>
        </div>
      </div>
    </Card>
  );
}