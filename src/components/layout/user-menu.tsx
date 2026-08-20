"use client";

import { useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

export function UserMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);

  if (!email) return null;

  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-sm transition-colors hover:bg-accent/50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
          {initials}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{email}</span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <UserIcon className="size-4 opacity-70" />
              <span className="truncate text-xs">{email}</span>
            </div>
            <div className="my-1 h-px bg-border" />
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={() => setOpen(false)}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
