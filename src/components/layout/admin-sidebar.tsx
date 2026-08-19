"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CircleDollarSign,
  Home,
  LogOut,
  Plug,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth/context";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/admin", icon: Home },
  { label: "Tenants", href: "/admin#tenants", icon: Building2 },
  { label: "Revenue", href: "/admin#revenue", icon: CircleDollarSign, disabled: true, badge: "Pronto" },
  { label: "Dispositivos", href: "/admin#devices", icon: Plug, disabled: true, badge: "Pronto" },
  { label: "Configuración", href: "/admin#settings", icon: Settings, disabled: true, badge: "Pronto" },
];

export function AdminSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border lg:flex">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="bg-sidebar-primary/15 text-sidebar-primary flex h-9 w-9 items-center justify-center rounded-lg">
          <Shield className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Antojos Platform</p>
          <p className="text-muted-foreground text-xs">Super admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href.split("#")[0]!) &&
                item.href !== "/admin";

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="text-muted-foreground/60 flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
                aria-disabled
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="bg-muted/40 text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground",
              )}
            >
              <Icon className={cn("size-4", isActive && "text-sidebar-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="bg-sidebar-primary/15 text-sidebar-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {user.email.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.email}</p>
            <p className="text-muted-foreground text-xs">Super admin</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md p-1.5"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
        <div className="text-muted-foreground mt-2 flex items-center gap-1.5 px-2 text-[10px]">
          <Sparkles className="size-3" />
          <span>Monitor maestro v2</span>
        </div>
      </div>
    </aside>
  );
}