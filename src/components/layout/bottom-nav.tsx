"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, ClipboardList, Boxes, MoonStar, Plus } from "lucide-react";
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

const ITEMS: BottomNavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/pedidos/nuevo", label: "Nuevo", icon: Plus, isAction: true },
  { href: "/ingredientes", label: "Stock", icon: Boxes },
  { href: "/cierre", label: "Cierre", icon: MoonStar },
];

export function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.85)]">
        <ul className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 pt-1.5">
          {ITEMS.map((item) => {
            const isActive = item.isAction
              ? false
              : item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const isCenter = item.isAction === true;
            const className = cn(
              "group relative flex h-14 w-full max-w-16 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-all",
              isActive && !isCenter
                ? "text-secondary"
                : "text-muted-foreground hover:text-foreground",
              isCenter &&
                "bg-gradient-to-br from-brand to-secondary text-primary-foreground brand-glow -translate-y-2 hover:brightness-110",
            );

            const inner = (
              <>
                {isActive ? (
                  <span
                    className="absolute -top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-secondary shadow-[0_0_12px_rgba(255,204,0,0.7)]"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "transition-transform",
                    isActive && !isCenter && "scale-110",
                    isCenter && "size-6",
                  )}
                />
                {!isCenter ? <span>{item.label}</span> : null}
              </>
            );

            return (
              <li key={item.href} className="flex justify-center">
                {item.isAction ? (
                  <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-label="Nuevo pedido"
                    className={className}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={className}
                  >
                    {inner}
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