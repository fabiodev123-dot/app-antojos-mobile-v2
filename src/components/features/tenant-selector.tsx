"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
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

  useEffect(() => {
    if (activeActingId || tenants.length === 0) return;
    startTransition(async () => {
      await setActingTenant(tenants[0].id);
      router.refresh();
    });
  }, [activeActingId, tenants, router]);

  function handleChange(value: string) {
    if (value === "__exit__") {
      startTransition(async () => {
        await clearActingTenant();
        router.refresh();
      });
      return;
    }
    if (!value) return;
    startTransition(async () => {
      await setActingTenant(value);
      router.refresh();
    });
  }

  const active = activeActingId
    ? tenants.find((t) => t.id === activeActingId)
    : null;

  return (
    <label
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors hover:bg-accent/50 focus-within:ring-1 focus-within:ring-ring ${
        pending ? "opacity-60" : ""
      }`}
    >
      <Building2 className="size-3.5 shrink-0 opacity-70" />
      <select
        aria-label="Actuar como tenant"
        disabled={pending}
        value={active?.id ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="h-full appearance-none bg-transparent pr-5 text-xs font-medium outline-none disabled:cursor-not-allowed"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23666'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.25rem center",
          backgroundSize: "12px 12px",
        }}
      >
        <option value="">Actuar como tenant…</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {active?.id === t.id ? "✓ " : ""}
            {t.name}
          </option>
        ))}
        {active ? <option value="__exit__">— Salir del modo act as</option> : null}
      </select>
    </label>
  );
}
