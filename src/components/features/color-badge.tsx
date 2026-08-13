import type { ColorPlato } from "@/lib/types";
import { COLOR_PLATO_HEX } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ColorDot({ color, className }: { color: ColorPlato; className?: string }) {
  const cfg = COLOR_PLATO_HEX[color];
  return <span className={cn("inline-block size-3 shrink-0 rounded-full ring-2 ring-background", cfg.dot, className)} aria-hidden />;
}

export function ColorBadge({ color, children }: { color: ColorPlato; children?: React.ReactNode }) {
  const cfg = COLOR_PLATO_HEX[color];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium", cfg.text)}>
      <ColorDot color={color} />
      {children ?? cfg.label}
    </span>
  );
}

export function ColorStripe({ color, className }: { color: ColorPlato; className?: string }) {
  const cfg = COLOR_PLATO_HEX[color];
  return <span className={cn("block h-full w-1.5 shrink-0 rounded-full", cfg.bg, className)} aria-hidden />;
}