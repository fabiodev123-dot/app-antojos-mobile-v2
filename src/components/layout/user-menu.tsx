"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  LogOut,
  Building2,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  Copy,
  Check,
} from "lucide-react";
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
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  const isSuperAdmin = userRole?.toLowerCase().includes("super");

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="relative"
    >
      <summary
        aria-label="Menú de usuario"
        className="group inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] pl-1 pr-2 text-xs font-medium text-zinc-200 transition-all hover:border-white/25 hover:bg-white/[0.1] select-none shadow-sm [&::-webkit-details-marker]:hidden"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-secondary text-[10px] font-bold text-zinc-950 shadow-[0_0_10px_rgba(255,102,0,0.35)]">
          {initials}
        </span>
        <span className="hidden md:inline-block max-w-[110px] truncate text-[11px] text-zinc-300">
          {email.split("@")[0]}
        </span>
        <ChevronDown className="size-3 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 top-full z-[100] mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-950 p-1.5 text-zinc-100 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header con email y badges */}
        <div className="rounded-lg bg-white/[0.04] p-2.5 border border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-secondary text-xs font-bold text-zinc-950 shadow-md">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={copyEmail}
                className="group flex w-full items-center justify-between gap-1 text-left"
                title="Copiar email"
              >
                <span className="truncate text-xs font-semibold text-zinc-200 group-hover:text-brand transition-colors">
                  {email}
                </span>
                {copied ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-success shrink-0">
                    <Check className="size-3" />
                  </span>
                ) : (
                  <Copy className="size-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>

              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {userRole ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand border border-brand/20 capitalize">
                    <ShieldCheck className="size-3" />
                    {userRole}
                  </span>
                ) : null}
                {actingTenantName ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 border border-zinc-700">
                    <Building2 className="size-3 opacity-70" />
                    <span className="truncate max-w-[100px]">{actingTenantName}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Acceso a Admin Panel si corresponde */}
        {isSuperAdmin ? (
          <>
            <div className="my-1 h-px bg-zinc-800" />
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <LayoutDashboard className="size-3.5 text-brand" />
              <span>Panel de Administración</span>
            </Link>
          </>
        ) : null}

        <div className="my-1 h-px bg-zinc-800" />

        {/* Botón Cerrar Sesión */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors"
          >
            <LogOut className="size-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </details>
  );
}
