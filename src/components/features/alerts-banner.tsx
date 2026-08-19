"use client";

import Link from "next/link";
import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminAlert } from "@/lib/services/admin-service";

const ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
} as const;

const STYLES = {
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
} as const;

export function AlertsBanner({ alerts }: { alerts: AdminAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <section className="space-y-2">
      {visible.map((alert) => {
        const Icon = ICONS[alert.severity];
        const Inner = (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              STYLES[alert.severity],
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{alert.message}</span>
            <button
              type="button"
              onClick={() =>
                setDismissed((prev) => new Set(prev).add(alert.id))
              }
              className="opacity-60 hover:opacity-100"
              aria-label="Descartar alerta"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
        if (alert.href) {
          return (
            <Link
              key={alert.id}
              href={alert.href}
              className="block transition-opacity hover:opacity-80"
            >
              {Inner}
            </Link>
          );
        }
        return <div key={alert.id}>{Inner}</div>;
      })}
    </section>
  );
}