"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, ClipboardList, Boxes, MoonStar, Plus, Store } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import { PedidoNewSheet } from "@/components/features/pedido-new-sheet";

interface BottomNavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Si true, no navega sino que abre un sheet (botón central). */
  isAction?: boolean;
}

/** Inicio · Pedidos · [+Nuevo] · Stock · Landing · Cierre */
const ITEMS: BottomNavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/pedidos/nuevo", label: "Nuevo", icon: Plus, isAction: true },
  { href: "/ingredientes", label: "Stock", icon: Boxes },
  { href: "/", label: "Landing", icon: Store },
  { href: "/cierre", label: "Cierre", icon: MoonStar },
];

export function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "border-t border-border/60",
          "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
          "pb-[env(safe-area-inset-bottom)]",
          "shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.6)]",
        )}
        role="navigation"
        aria-label="Menú principal"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6 items-end gap-0 px-1 pt-1 pb-1">
          {ITEMS.map((item) => {
            const isActive = item.isAction
              ? false
              : item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const Icon = item.icon;
            const isCenter = item.isAction === true;

            return (
              <li
                key={item.href + item.label}
                className={cn(
                  "flex flex-col items-center justify-end",
                  isCenter && "-mt-3",
                )}
              >
                {isCenter ? (
                  /* ── Botón central: elevated FAB ── */
                  <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-label="Nuevo pedido"
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-full",
                      "bg-gradient-to-br from-brand to-secondary",
                      "text-primary-foreground shadow-lg shadow-brand/30",
                      "ring-2 ring-background",
                      "-translate-y-1 transition-all",
                      "active:scale-95 active:brightness-90",
                      "hover:brightness-110 hover:shadow-brand/40",
                    )}
                  >
                    <Plus className="size-5" strokeWidth={2.5} />
                  </button>
                ) : (
                  /* ── Links normales ── */
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl",
                      "text-[10px] leading-tight font-medium",
                      "transition-all duration-150",
                      isActive
                        ? "text-brand"
                        : "text-muted-foreground active:text-foreground",
                    )}
                  >
                    {/* ── Indicator: pill dot arriba del icono ── */}
                    {isActive && (
                      <span
                        className="absolute -top-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_8px_rgba(232,112,10,0.6)]"
                        aria-hidden
                      />
                    )}

                    <Icon
                      className={cn(
                        "size-5 transition-transform duration-150",
                        isActive && "scale-110",
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />

                    <span
                      className={cn(
                        "mt-0.5 transition-colors",
                        isActive && "font-semibold",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <PedidoNewSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}