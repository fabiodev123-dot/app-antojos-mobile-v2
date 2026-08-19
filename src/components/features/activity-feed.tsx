"use client";

import Link from "next/link";
import {
  Activity,
  ShoppingBag,
  Zap,
  Settings,
  UserPlus,
  UserMinus,
  ChevronRight,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatHora, formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  RecentActivity,
  AuditLogEntry,
  TenantWithStats,
} from "@/lib/services/admin-service";

type FeedItem =
  | {
      kind: "sale";
      ts: string;
      tenantId: string;
      description: string;
      amount: number;
      isVentaRapida: boolean;
    }
  | {
      kind: "admin";
      ts: string;
      action: string;
      targetType: string;
      targetLabel: string | null;
      superAdminEmail: string;
    };

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "ahora";
  if (ms < 3_600_000) return `hace ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.floor(ms / 3_600_000)} h`;
  return `hace ${Math.floor(ms / 86_400_000)} d`;
}

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "tenant.status_changed": Pencil,
  "tenant.plan_changed": Pencil,
  "tenant.created": Settings,
  "user.added_to_tenant": UserPlus,
  "user.removed_from_tenant": UserMinus,
  "user.role_changed": UserPlus,
  "system.login": Settings,
};

const ACTION_LABEL: Record<string, string> = {
  "tenant.status_changed": "cambió status de",
  "tenant.plan_changed": "cambió plan de",
  "tenant.created": "creó tenant",
  "user.added_to_tenant": "agregó usuario a",
  "user.removed_from_tenant": "eliminó usuario de",
  "user.role_changed": "cambió rol de usuario en",
  "system.login": "inició sesión",
};

export function ActivityFeed({
  activity,
  auditLog,
  tenants,
}: {
  activity: RecentActivity[];
  auditLog: AuditLogEntry[];
  tenants: TenantWithStats[];
}) {
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const items: FeedItem[] = [
    ...activity.map<FeedItem>((e) => ({
      kind: "sale",
      ts: e.ts,
      tenantId: e.tenantId,
      description: e.description,
      amount: e.amount,
      isVentaRapida: e.eventType === "venta_rapida",
    })),
    ...auditLog.map<FeedItem>((e) => ({
      kind: "admin",
      ts: e.createdAt,
      action: e.action,
      targetType: e.targetType,
      targetLabel: e.targetLabel,
      superAdminEmail: e.superAdminEmail,
    })),
  ].sort((a, b) => (a.ts < b.ts ? 1 : -1));

  if (items.length === 0) {
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
              Ventas + acciones del admin
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/60">
          {items.slice(0, 12).map((item, i) => {
            if (item.kind === "sale") {
              const tenant = tenantById.get(item.tenantId);
              const Icon = item.isVentaRapida ? Zap : ShoppingBag;
              const href = tenant ? `/admin/tenants/${tenant.id}` : "#";
              return (
                <li key={`s-${i}`}>
                  <Link
                    href={href}
                    className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        item.isVentaRapida
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary/15 text-secondary",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">
                          {tenant?.name ?? item.tenantId}
                        </span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {item.description}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {timeAgo(item.ts)} ·{" "}
                        {formatHora(item.ts.slice(11, 16))}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-heading text-sm font-semibold tabular-nums",
                        item.isVentaRapida
                          ? "text-success"
                          : "text-foreground",
                      )}
                    >
                      {formatPrecio(item.amount)}
                    </span>
                    <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                  </Link>
                </li>
              );
            }
            const Icon = ACTION_ICON[item.action] ?? Settings;
            const label = ACTION_LABEL[item.action] ?? item.action;
            const href =
              item.targetType === "tenant" && item.targetLabel
                ? `/admin/tenants/${tenants.find((t) => t.name === item.targetLabel)?.id ?? ""}`
                : "#";
            return (
              <li key={`a-${i}`}>
                <Link
                  href={href}
                  className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors"
                >
                  <div className="bg-info/15 text-info flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">
                        {item.superAdminEmail}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        {label}{" "}
                        {item.targetLabel && (
                          <span className="font-medium text-foreground">
                            {item.targetLabel}
                          </span>
                        )}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {timeAgo(item.ts)} ·{" "}
                      {formatHora(item.ts.slice(11, 16))}
                    </p>
                  </div>
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