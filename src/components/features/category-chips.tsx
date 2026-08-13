"use client";

import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  categorias: { id: string; nombre: string; emoji?: string }[];
  activa: string;
  onChange: (id: string) => void;
  className?: string;
  /** Si true, agrega la opción "Todas" al inicio. Default: true */
  withTodas?: boolean;
}

/**
 * Lista horizontal de chips scrolleable sin scrollbar visible.
 *
 * - Webkit/Firefox/IE: scrollbar oculto (clase `.scrollbar-none`)
 * - Touch UX: `touch-action: pan-x`, swipe horizontal nativo
 * - Layout: `flex`, `overflow-x-auto`, `overflow-y-hidden`, `items-center`
 * - Sin flex-1 en los hijos: cada chip mantiene su ancho natural
 */
export function CategoryChips({
  categorias,
  activa,
  onChange,
  className,
  withTodas = true,
}: CategoryChipsProps) {
  const items = withTodas ? [{ id: "todas", nombre: "Todas" }, ...categorias] : categorias;

  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto overflow-y-hidden scrollbar-none",
        "touch-pan-x snap-x",
        className,
      )}
    >
      <div className="flex items-center gap-2 whitespace-nowrap px-4 pb-1 pt-0.5">
        {items.map((c) => (
          <Chip
            key={c.id}
            active={activa === c.id}
            onClick={() => onChange(c.id)}
          >
            {c.emoji ? <span aria-hidden>{c.emoji}</span> : null}
            <span>{c.nombre}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all select-none",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary text-primary-foreground brand-glow"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}