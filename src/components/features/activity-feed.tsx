"use client";

import Link from "next/link";
import { Activity, ShoppingBag, Zap, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatHora, formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RecentActivity, TenantWithStats } from "@/lib/services/admin-service";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "ahora";
  if (ms < 3_600_000) return `hace ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.floor(ms / 3_600_000)} h`;
  return `hace ${Math.floor(ms / 86_400_000)} d`;
}

export function ActivityFeed({
  activity,
  tenants,
}: {
  activity: RecentActivity[];
  tenants: TenantWithStats[];
}) {
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  if (activity.length === 0) {
    return (
      <Card className="p-0 card-elevated">
        <CardHeader className="border-b border-border/60 p-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="text-primary size-4" />
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            Sin actividad reciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 card-elevated">
      <CardHeader className="border-b border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="text-primary size-4" />
              Actividad reciente
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Pedidos cerrados + ventas rápidas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/60">
          {activity.slice(0, 10).map((event, i) => {
            const tenant = tenantById.get(event.tenantId);
            const isVenta = event.eventType === "venta_rapida";
            const Icon = isVenta ? Zap : ShoppingBag;
            const href = tenant ? `/admin/tenants/${tenant.id}` : "#";
            return (
              <li key={i}>
                <Link
                  href={href}
                  className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      isVenta
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary/15 text-secondary",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">
                        {tenant?.name ?? event.tenantId}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {event.description}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {timeAgo(event.ts)} · {formatHora(event.ts.slice(11, 16))}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-heading text-sm font-semibold tabular-nums",
                      isVenta ? "text-success" : "text-foreground",
                    )}
                  >
                    {formatPrecio(event.amount)}
                  </span>
                  <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}