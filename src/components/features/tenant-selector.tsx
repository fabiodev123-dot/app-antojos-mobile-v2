"use client";

import { useEffect, useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, LogOut } from "lucide-react";
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
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (activeActingId || tenants.length === 0) return;
    startTransition(async () => {
      await setActingTenant(tenants[0].id);
      router.refresh();
    });
  }, [activeActingId, tenants, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  function pick(id: string) {
    setOpen(false);
    startTransition(async () => {
      await setActingTenant(id);
      router.refresh();
    });
  }

  function exit() {
    setOpen(false);
    startTransition(async () => {
      await clearActingTenant();
      router.refresh();
    });
  }

  const active = activeActingId
    ? tenants.find((t) => t.id === activeActingId)
    : null;

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="relative"
    >
      <summary
        className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent/50 [&::-webkit-details-marker]:hidden"
      >
        <Building2 className="size-3.5 opacity-70" />
        <span className="max-w-[10rem] truncate">
          {active ? active.name : "Elegir tenant…"}
        </span>
        {active ? <Check className="size-3 text-success" /> : null}
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cambiar de tenant
        </p>
        <ul>
          {tenants.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => pick(t.id)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="size-3.5 opacity-70" />
                  <span className="truncate">{t.name}</span>
                </span>
                {active?.id === t.id ? (
                  <Check className="size-3.5 text-success" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {active ? (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              disabled={pending}
              onClick={exit}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <LogOut className="size-3.5" />
              Salir del modo act as
            </button>
          </>
        ) : null}
      </div>
    </details>
  );
}
