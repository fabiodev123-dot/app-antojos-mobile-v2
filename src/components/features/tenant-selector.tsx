"use client";

import { useEffect, useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, LogOut, ChevronDown } from "lucide-react";
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
        className="group inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 text-xs font-medium text-zinc-200 transition-all hover:border-white/25 hover:bg-white/[0.1] select-none shadow-sm [&::-webkit-details-marker]:hidden"
      >
        <Building2 className="size-3.5 text-secondary opacity-90" />
        <span className="max-w-[110px] sm:max-w-[150px] truncate font-medium">
          {active ? active.name : "Elegir tenant…"}
        </span>
        <ChevronDown className="size-3 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 top-full z-[100] mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-950 p-1.5 text-zinc-100 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Sucursal / Tenant
          </p>
        </div>
        <ul className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-none">
          {tenants.map((t) => {
            const isSelected = active?.id === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => pick(t.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-brand/15 text-brand font-semibold border border-brand/30"
                      : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Building2 className={`size-3.5 ${isSelected ? "text-brand" : "opacity-60"}`} />
                    <span className="truncate">{t.name}</span>
                  </span>
                  {isSelected ? (
                    <Check className="size-3.5 text-brand shrink-0" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {active ? (
          <>
            <div className="my-1 h-px bg-zinc-800" />
            <button
              type="button"
              disabled={pending}
              onClick={exit}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
            >
              <LogOut className="size-3.5" />
              <span>Salir del modo act as</span>
            </button>
          </>
        ) : null}
      </div>
    </details>
  );
}
