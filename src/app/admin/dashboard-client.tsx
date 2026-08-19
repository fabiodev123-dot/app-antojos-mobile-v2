"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFechaCorta, formatPrecio } from "@/lib/format";
import type {
  TenantWithStats,
  GlobalStats,
  TenantStatus,
  Revenue,
  RevenueTrendPoint,
  ActiveDevice,
  DevicesByTenant,
  AdminAlert,
  RecentActivity,
  AuditLogEntry,
} from "@/lib/services/admin-service";
import { RevenueTrendCard } from "@/components/features/revenue-trend-card";
import { DevicesCard } from "@/components/features/devices-card";
import { AlertsBanner } from "@/components/features/alerts-banner";
import { ActivityFeed } from "@/components/features/activity-feed";

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: "Activo",
  trial: "Trial",
  suspended: "Suspendido",
};

const STATUS_ICON: Record<TenantStatus, typeof CheckCircle2> = {
  active: CheckCircle2,
  trial: Clock,
  suspended: AlertCircle,
};

const STATUS_VARIANT: Record<TenantStatus, "default" | "secondary" | "destructive"> = {
  active: "secondary",
  trial: "default",
  suspended: "destructive",
};

const PLAN_LABEL = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
} as const;

export function AdminDashboardClient({
  stats,
  tenants,
  revenue,
  trend,
  activeDevicesCount,
  devicesByTenant,
  activeDevices,
  alerts,
  activity,
  auditLog,
}: {
  stats: GlobalStats;
  tenants: TenantWithStats[];
  revenue: Revenue;
  trend: RevenueTrendPoint[];
  activeDevicesCount: number;
  devicesByTenant: DevicesByTenant[];
  activeDevices: ActiveDevice[];
  alerts: AdminAlert[];
  activity: RecentActivity[];
  auditLog: AuditLogEntry[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {alerts.length > 0 && <AlertsBanner alerts={alerts} />}
      {/* KPI ROW */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          icon={<Building2 className="size-4" />}
          label="Tenants"
          value={stats.totalTenants}
          sublabel={
            <>
              <span className="text-success">{stats.activeTenants} activos</span>
              {stats.trialTenants > 0 && (
                <>
                  · <span className="text-warning">{stats.trialTenants} trial</span>
                </>
              )}
              {stats.suspendedTenants > 0 && (
                <>
                  · <span className="text-destructive">{stats.suspendedTenants} suspendidos</span>
                </>
              )}
            </>
          }
        />
        <KPI
          icon={<Users className="size-4" />}
          label="Usuarios totales"
          value={stats.totalUsers}
          sublabel={`${stats.totalActiveUsersThisWeek} tenants activos esta semana`}
        />
        <KPI
          icon={<ShoppingCart className="size-4" />}
          label="Pedidos hoy"
          value={stats.totalOrdersToday}
          sublabel={`${stats.totalOrdersThisWeek} en los últimos 7 días`}
        />
        <KPI
          icon={<TrendingUp className="size-4" />}
          label="Plataforma"
          value="SaaS"
          sublabel="Multi-tenant · path-based"
        />
      </section>

      {/* REVENUE ROW */}
      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          icon={<CircleDollarSign className="size-4" />}
          label="Revenue hoy"
          value={formatPrecio(revenue.pedidos.today + revenue.ventasRapidas.today)}
          sublabel={
            <>
              <span className="text-success">{formatPrecio(revenue.pedidos.today)} pedidos</span>
              {revenue.ventasRapidas.today > 0 && (
                <>
                  · <span className="text-info">{formatPrecio(revenue.ventasRapidas.today)} rápidas</span>
                </>
              )}
            </>
          }
        />
        <KPI
          icon={<CircleDollarSign className="size-4" />}
          label="Revenue 7d"
          value={formatPrecio(revenue.pedidos.last7d + revenue.ventasRapidas.last7d)}
          sublabel={formatPrecio(revenue.ventasRapidas.last7d) + " en ventas rápidas"}
        />
        <KPI
          icon={<CircleDollarSign className="size-4" />}
          label="Revenue 30d"
          value={formatPrecio(revenue.pedidos.last30d + revenue.ventasRapidas.last30d)}
          sublabel={formatPrecio(revenue.ventasRapidas.last30d) + " en ventas rápidas"}
        />
        <KPI
          icon={<Receipt className="size-4" />}
          label="Revenue total"
          value={formatPrecio(revenue.pedidos.total + revenue.ventasRapidas.total)}
          sublabel={`${stats.totalOrdersToday + (revenue.ventasRapidas.today > 0 ? 1 : 0)} movimientos hoy`}
        />
      </section>

      {/* REVENUE TREND + ACTIVITY */}
      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTrendCard data={trend} />
        </div>
        <ActivityFeed
          activity={activity}
          auditLog={auditLog}
          tenants={tenants}
        />
      </section>

      {/* DEVICES */}
      <section className="mt-4">
        <DevicesCard
          activeCount={activeDevicesCount}
          devices={activeDevices}
          byTenant={devicesByTenant}
          tenants={tenants}
        />
      </section>

      {/* FILTROS */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          <FilterChip
            label="Todos"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <FilterChip
            label="Activos"
            active={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
          />
          <FilterChip
            label="Trial"
            active={statusFilter === "trial"}
            onClick={() => setStatusFilter("trial")}
          />
          <FilterChip
            label="Suspendidos"
            active={statusFilter === "suspended"}
            onClick={() => setStatusFilter("suspended")}
          />
        </div>
      </section>

      {/* TENANT GRID */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Tenants
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({filtered.length} de {tenants.length})
            </span>
          </h2>
        </header>

        {filtered.length === 0 ? (
          <EmptyTenants />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel: React.ReactNode;
}) {
  return (
    <Card className="p-0 card-elevated">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            {label}
          </span>
          <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md">
            {icon}
          </span>
        </div>
        <p className="font-heading mt-2 text-2xl font-bold tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function TenantCard({ tenant }: { tenant: TenantWithStats }) {
  const StatusIcon = STATUS_ICON[tenant.status];
  const lastActivityText = tenant.lastActivity
    ? formatFechaCorta(tenant.lastActivity)
    : "Sin actividad";

  return (
    <Link
      href={`/admin/tenants/${tenant.id}`}
      className="group block"
    >
      <Card className="hover:border-primary/40 p-0 transition-all hover-lift">
        <CardHeader className="border-b border-border/60 bg-gradient-to-r from-muted/30 to-transparent p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{tenant.name}</CardTitle>
              <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                /{tenant.slug}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[tenant.status]} className="gap-1">
              <StatusIcon className="size-3" />
              {STATUS_LABEL[tenant.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Usuarios" value={String(tenant.userCount)} />
            <Stat label="Pedidos hoy" value={String(tenant.todayOrders)} />
            <Stat
              label="Plan"
              value={PLAN_LABEL[tenant.plan]}
              valueClassName="capitalize"
            />
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Boxes className="size-3" />
            <span>Última actividad: {lastActivityText}</span>
          </div>
        </CardContent>
        <div className="text-muted-foreground group-hover:text-foreground border-t border-border/60 px-4 py-2 text-xs transition-colors">
          Ver detalle
          <ArrowRight className="ml-1 inline size-3" />
        </div>
      </Card>
    </Link>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className={cn("font-heading text-base font-semibold tabular-nums", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function EmptyTenants() {
  return (
    <Card className="p-0">
      <CardContent className="py-12 text-center">
        <Building2 className="text-muted-foreground/30 mx-auto size-12" />
        <p className="mt-3 text-sm font-medium">No hay tenants que mostrar</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Probá cambiar los filtros o crear uno nuevo
        </p>
      </CardContent>
    </Card>
  );
}
