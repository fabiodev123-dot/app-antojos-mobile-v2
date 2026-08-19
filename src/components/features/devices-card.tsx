"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plug, Smartphone, MonitorSmartphone, Globe, Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFechaCorta, formatHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActiveDevice, DevicesByTenant, TenantWithStats } from "@/lib/services/admin-service";

const PLATFORM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  ios: Smartphone,
  android: Smartphone,
  pwa: MonitorSmartphone,
  web: Globe,
};

const PLATFORM_LABEL: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  pwa: "PWA",
  web: "Web",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "ahora";
  if (ms < 3_600_000) return `hace ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.floor(ms / 3_600_000)} h`;
  return `hace ${Math.floor(ms / 86_400_000)} d`;
}

export function DevicesCard({
  activeCount,
  devices,
  byTenant,
  tenants,
}: {
  activeCount: number;
  devices: ActiveDevice[];
  byTenant: DevicesByTenant[];
  tenants: TenantWithStats[];
}) {
  const tenantById = useMemo(
    () => new Map(tenants.map((t) => [t.id, t])),
    [tenants],
  );

  if (activeCount === 0 && devices.length === 0) {
    return (
      <Card className="p-0 card-elevated">
        <CardHeader className="border-b border-border/60 p-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Plug className="text-primary size-4" />
            Dispositivos activos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <Circle className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          <p className="text-muted-foreground text-sm">
            Ningún dispositivo activo en los últimos 5 minutos.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Los dispositivos aparecen acá cuando los rotisería abren la app.
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
              <Plug className="text-primary size-4" />
              Dispositivos activos
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Conectados en los últimos 5 minutos
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success gap-1"
          >
            <Circle className="size-2 fill-current" />
            {activeCount} {activeCount === 1 ? "dispositivo" : "dispositivos"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {byTenant.length > 0 && (
          <div className="border-b border-border/60 p-4">
            <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
              Por tenant
            </p>
            <ul className="space-y-1.5">
              {byTenant.map((t) => {
                const tenant = tenantById.get(t.tenantId);
                if (!tenant) return null;
                return (
                  <li
                    key={t.tenantId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/admin/tenants/${t.tenantId}`}
                      className="text-foreground hover:text-primary truncate font-medium"
                    >
                      {tenant.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs">
                      {t.activeDevices > 0 && (
                        <span className="text-success font-semibold tabular-nums">
                          {t.activeDevices} activos
                        </span>
                      )}
                      <span className="text-muted-foreground tabular-nums">
                        {t.totalDevices} total
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {devices.length > 0 && (
          <div className="p-4">
            <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
              Activos ahora
            </p>
            <ul className="divide-y divide-border/60">
              {devices.slice(0, 8).map((d) => {
                const tenant = tenantById.get(d.tenantId);
                const PlatformIcon = PLATFORM_ICON[d.platform ?? ""] ?? Globe;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          d.platform === "ios" || d.platform === "android"
                            ? "bg-info/15 text-info"
                            : d.platform === "pwa"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        <PlatformIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {tenant?.name ?? d.tenantId}
                        </p>
                        <p className="text-muted-foreground font-mono text-[10px]">
                          {d.userId.slice(0, 8)}… ·{" "}
                          {d.platform ? PLATFORM_LABEL[d.platform] : "?"} ·{" "}
                          {d.appVersion ?? "—"}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-muted-foreground shrink-0 text-xs tabular-nums"
                      title={`${formatFechaCorta(d.lastSeen)} ${formatHora(d.lastSeen.slice(11, 16))}`}
                    >
                      {timeAgo(d.lastSeen)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}