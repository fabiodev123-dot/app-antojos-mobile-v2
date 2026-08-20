"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setActingTenant, clearActingTenant } from "@/lib/auth/acting";

export type TenantOption = {
  id: string;
  name: string;
};

export function TenantSelector({
  tenants,
  activeActingId,
}: {
  tenants: TenantOption[];
  activeActingId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pick(id: string) {
    setBusy(true);
    try {
      await setActingTenant(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function exit() {
    setBusy(true);
    try {
      await clearActingTenant();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const active = activeActingId
    ? tenants.find((t) => t.id === activeActingId)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          <Building2 className="size-3.5" />
          <span className="hidden sm:inline">
            {active ? active.name : "Actuar como tenant"}
          </span>
          <ChevronDown className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">
          {active ? "Cambiar de tenant" : "Elegir tenant para actuar"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            disabled={busy}
            onSelect={() => pick(t.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{t.name}</span>
            {active?.id === t.id ? <Check className="size-3.5 opacity-70" /> : null}
          </DropdownMenuItem>
        ))}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={busy}
              onSelect={exit}
              className="text-destructive focus:text-destructive"
            >
              Salir del modo "act as"
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
