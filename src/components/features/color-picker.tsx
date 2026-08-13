"use client";

import { COLOR_PLATO_HEX, type ColorPlato } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: ColorPlato;
  onChange: (color: ColorPlato) => void;
  className?: string;
}

const COLORS: ColorPlato[] = [
  "red",
  "pink",
  "rose",
  "orange",
  "amber",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "beige",
  "gray",
];

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("grid grid-cols-6 gap-2", className)}>
      {COLORS.map((c) => {
        const cfg = COLOR_PLATO_HEX[c];
        const selected = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Color ${cfg.label}`}
            aria-pressed={selected}
            className={cn(
              "group relative h-10 w-full rounded-lg ring-2 ring-offset-2 ring-offset-background transition-all",
              cfg.bg,
              selected ? "ring-foreground scale-105" : "ring-transparent hover:ring-foreground/30",
            )}
          >
            <span className="sr-only">{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}