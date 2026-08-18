import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, CircleDollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSuperAdmin } from "@/lib/auth/context";
import { getTenantDetail } from "@/lib/services/admin-service";
import { formatFechaLarga, formatPrecio } from "@/lib/format";
import { UsersList, RecentOrdersTable, OrdersBarChart } from "./tenant-detail-components";

const STATUS_LABEL = {
  active: "Activo",
  trial: "Trial",
  suspended: "Suspendido",
} as const;

const STATUS_VARIANT = {
  active: "secondary",
  trial: "default",
  suspended: "destructive",
} as const;

const STATUS_ICON = {
  active: CheckCircle2,
  trial: Clock,
  suspended: AlertCircle,
} as const;

const PLAN_LABEL = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
} as const;

const PLAN_VARIANT = {
  free: "outline",
  basic: "default",
  pro: "secondary",
} as const;

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const tenant = await getTenantDetail(id);

  if (!tenant) notFound();

  const StatusIcon = STATUS_ICON[tenant.status];
  const totalRevenue30d = tenant.ordersByDay.reduce((sum, d) => sum + d.total, 0);

  return (
    <main className="bg-background min-h-svh">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* BACK + TITLE */}
        <div className="mb-4">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-3.5" />
            Volver al panel
          </Link>
        </div>

        {/* TENANT HEADER */}
        <Card className="mb-4 p-0">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{tenant.name}</h1>
                <Badge variant={STATUS_VARIANT[tenant.status]} className="gap-1">
                  <StatusIcon className="size-3" />
                  {STATUS_LABEL[tenant.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 font-mono text-sm">
                /t/{tenant.slug}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={PLAN_VARIANT[tenant.plan]} className="px-3 py-1">
                <CircleDollarSign className="mr-1 size-3" />
                Plan {PLAN_LABEL[tenant.plan]}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Usuarios" value={String(tenant.userCount)} />
          <Metric label="Pedidos hoy" value={String(tenant.todayOrders)} />
          <Metric
            label="Revenue 30d"
            value={formatPrecio(totalRevenue30d)}
            valueClassName="text-base"
          />
          <Metric
            label="Activo desde"
            value={formatFechaLarga(tenant.createdAt).split(",")[0]}
            valueClassName="text-base"
            icon={<Calendar className="text-muted-foreground size-3.5" />}
          />
        </div>

        {/* CHART */}
        <div className="mt-4">
          <OrdersBarChart data={tenant.ordersByDay} />
        </div>

        {/* USERS + ORDERS */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <UsersList users={tenant.users} />
          <RecentOrdersTable orders={tenant.recentOrders} />
        </div>

        {/* METADATA FOOTER */}
        <Card className="bg-muted/30 mt-4 p-0">
          <CardContent className="grid grid-cols-2 gap-3 p-4 text-xs sm:grid-cols-4">
            <Field label="Tenant ID" value={tenant.id} mono />
            <Field label="Slug" value={tenant.slug} mono />
            <Field label="Creado" value={formatFechaLarga(tenant.createdAt)} />
            <Field label="Última actividad" value={tenant.lastActivity ? formatFechaLarga(tenant.lastActivity) : "—"} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  valueClassName,
  icon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-0 card-elevated">
      <CardContent className="p-4">
        <div className="text-muted-foreground flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
          <span>{label}</span>
          {icon}
        </div>
        <p className={`font-heading mt-2 text-2xl font-bold tabular-nums leading-tight ${valueClassName ?? ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
