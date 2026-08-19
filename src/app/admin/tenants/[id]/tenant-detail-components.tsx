import "server-only";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFechaCorta, formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrdersByDay, RecentOrder, TenantUser } from "@/lib/services/admin-service";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  preparando: "En cocina",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ESTADO_TONE: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning border-warning/30",
  preparando: "bg-info/15 text-info border-info/30",
  listo: "bg-success/15 text-success border-success/30",
  entregado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function UsersList({ users }: { users: TenantUser[] }) {
  if (users.length === 0) {
    return (
      <Card className="p-0">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Este tenant no tiene usuarios aún.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border/60 p-4">
        <CardTitle className="text-sm">Usuarios ({users.length})</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/60 p-0">
        {users.map((u) => (
          <div key={u.userId} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.email}</p>
              <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                {u.userId.slice(0, 8)}…
              </p>
            </div>
            <Badge variant="outline" className="capitalize">
              {u.role}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return (
      <Card className="p-0">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Este tenant no tiene pedidos aún.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border/60 p-4">
        <CardTitle className="text-sm">Pedidos recientes ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 p-3">
              <span className="text-muted-foreground font-mono text-xs">
                #{o.numero}
              </span>
              <span className="flex-1 truncate text-sm">{o.nombreCliente}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  ESTADO_TONE[o.estado] ?? "bg-muted text-muted-foreground",
                )}
              >
                {ESTADO_LABEL[o.estado] ?? o.estado}
              </span>
              <span className="font-heading shrink-0 text-sm font-semibold tabular-nums">
                {formatPrecio(o.total)}
              </span>
              <span className="text-muted-foreground w-14 shrink-0 text-right text-xs">
                {formatFechaCorta(o.fecha)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersBarChart({ data }: { data: OrdersByDay[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-0">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Sin pedidos en los últimos 30 días.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border/60 p-4">
        <CardTitle className="text-sm">Últimos 30 días</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex h-40 items-end gap-1">
          {data.map((d) => {
            const heightPct = (d.total / maxTotal) * 100;
            return (
              <div
                key={d.fecha}
                className="group/bar relative flex h-full flex-1 flex-col items-center justify-end"
                title={`${d.fecha}: ${formatPrecio(d.total)} · ${d.cantidad} pedidos`}
              >
                <div
                  className="bg-primary/70 hover:bg-primary w-full rounded-t-sm transition-colors"
                  style={{ height: `${heightPct}%`, minHeight: d.cantidad > 0 ? "2px" : "0" }}
                />
              </div>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
          <span>{data[0]?.fecha}</span>
          <span className="font-medium">
            Total: {formatPrecio(data.reduce((s, d) => s + d.total, 0))}
          </span>
          <span>{data[data.length - 1]?.fecha}</span>
        </div>
      </CardContent>
    </Card>
  );
}
