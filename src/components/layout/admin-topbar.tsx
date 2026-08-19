"use client";

import { useState } from "react";
import { Menu, Search, Plus, Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminSidebar } from "./admin-sidebar";
import type { AuthUser } from "@/lib/auth/context";

export function AdminTopbar({ user }: { user: AuthUser }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="bg-card/50 border-border/60 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-4" />
        </Button>

        <div className="min-w-0 flex-1 lg:flex-none">
          <h1 className="truncate text-sm font-semibold">Monitor Maestro</h1>
          <p className="text-muted-foreground hidden text-xs lg:block">
            Vista global de la plataforma
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Buscar tenant, user, pedido..."
              className="h-8 w-64 pl-8 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Notificaciones"
            className="relative"
          >
            <Bell className="size-4" />
            <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
          </Button>
          <Button type="button" size="sm" className="hidden sm:inline-flex">
            <Plus className="size-3.5" />
            <span>Nuevo tenant</span>
          </Button>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-60 gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <AdminSidebar user={user} />
        </SheetContent>
      </Sheet>
    </header>
  );
}