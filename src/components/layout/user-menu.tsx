"use client";

import { useEffect, useState, useRef } from "react";
import { LogOut, User as UserIcon, Building2, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

export type UserMenuProps = {
  email: string | null;
  actingTenantName: string | null;
  userRole: string | null;
};

export function UserMenu({ email, actingTenantName, userRole }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

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

  if (!email) return null;

  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="relative"
    >
      <summary
        aria-label="Menú de usuario"
        className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 [&::-webkit-details-marker]:hidden"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {initials}
        </span>
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
            <button
              type="button"
              onClick={copyEmail}
              className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
              title="Copiar email"
            >
              {email}
            </button>
          </div>

          {actingTenantName ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
              <Building2 className="size-3.5 opacity-70" />
              <span className="truncate">
                <span className="text-muted-foreground">Tenant: </span>
                <span className="font-medium">{actingTenantName}</span>
              </span>
            </div>
          ) : null}

          {userRole ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
              <ShieldCheck className="size-3.5 opacity-70" />
              <span className="truncate">
                <span className="text-muted-foreground">Rol: </span>
                <span className="font-medium capitalize">{userRole}</span>
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border" />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Cerrar sesión
            {copied ? (
              <span className="ml-auto text-[10px] text-muted-foreground">email copiado</span>
            ) : null}
          </button>
        </form>
      </div>
    </details>
  );
}
