"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  Truck,
  MoonStar,
  ChefHat,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  clientesRepository,
  gastosRepository,
  pedidosRepository,
  productosRepository,
  ventasRapidasRepository,
} from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader, PageHeader } from "@/components/layout/shell-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { formatHora, formatPrecio, hoy } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WeeklySummary } from "@/components/features/weekly-summary";

function greetingForHour(h: number): string {
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Hooks client-only via `useSyncExternalStore`.
 *
 * Evita React #418 (hydration mismatch): el server snapshot es "" y el
 * client snapshot es el valor real. Patrón compatible con React Compiler
 * (`react-hooks/set-state-in-effect`) — sin useEffect ni setState. Igual
 * al patrón de `pwa-install.tsx:25-31` y `use-time-ago.ts`.
 */
function useClientDateLabel(): string {
  return useSyncExternalStore(
    () => () => {},
    () =>
      new Date().toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    () => "",
  );
}

function useClientGreeting(): string {
  return useSyncExternalStore(
    () => () => {},
    () => greetingForHour(new Date().getHours()),
    () => "",
  );
}

export default function HomePage() {
  const pedidos = useRepositoryList(pedidosRepository);
  const productos = useRepositoryList(productosRepository);
  const clientes = useRepositoryList(clientesRepository);
  const gastos = useRepositoryList(gastosRepository);
  const ventasRapidas = useRepositoryList(ventasRapidasRepository);

  const greet = useClientGreeting();
  const dateLabel = useClientDateLabel();

  const today = hoy();
  const pedidosHoy = pedidos.filter((p) => p.fecha === today);
  const pedidosActivos = pedidos.filter(
    (p) => p.estado === "pendiente" || p.estado === "preparando",
  );
  // ventasHoy = pedidos cerrados del día + ventas rápidas del día.
  // Centralizado en lib/utils/ventas para que cierre y resumen semanal
  // usen la misma regla.
  const ventasRapidasHoy = ventasRapidas.filter((v) => v.fecha === today);
  const ventasHoy = pedidosHoy
    .filter((p) => p.estado === "entregado" || p.estado === "listo")
    .reduce((sum, p) => sum + p.total, 0)
    + ventasRapidasHoy.reduce((sum, v) => sum + v.monto, 0);
  const gastosHoy = gastos
    .filter((g) => g.fecha === today)
    .reduce((sum, g) => sum + g.monto, 0);
  const gananciaEstimada = ventasHoy - gastosHoy;
  const stockBajo = productos.filter((p) => p.activo && p.stockActual <= p.stockMinimo);
  const itemsVendidos = pedidosHoy
    .filter((p) => p.estado === "entregado" || p.estado === "listo")
    .reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.cantidad, 0), 0);

  return (
    <>
      <ShellHeader title="Antojos" subtitle={greet ? `${greet}, rotisería` : "rotisería"} />
      <main className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <PageHeader
          title="Resumen del día"
          subtitle={dateLabel || " "}
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<TrendingUp className="size-3.5" />}
            label="Ventas hoy"
            value={formatPrecio(ventasHoy)}
            tone="positive"
            gradient
            highlight
          />
          <StatCard
            icon={<ClipboardList className="size-3.5" />}
            label="Activos"
            value={String(pedidosActivos.length)}
            tone={pedidosActivos.length > 0 ? "warning" : "muted"}
          />
          <StatCard
            icon={<AlertTriangle className="size-3.5" />}
            label="Stock bajo"
            value={String(stockBajo.length)}
            tone={stockBajo.length > 0 ? "danger" : "muted"}
          />
          <StatCard
            icon={<Package className="size-3.5" />}
            label="En carta"
            value={String(productos.filter((p) => p.activo).length)}
            tone="muted"
          />
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            href="/pedidos/nuevo?mode=wsp"
            icon={<Sparkles className="size-4" />}
            title="Pegar pedido de WSP"
            subtitle="Descifrar mensaje del cliente"
            primary
          />
          <QuickAction
            href="/pedidos/nuevo"
            icon={<Plus className="size-4" />}
            title="Nuevo pedido"
            subtitle="Carga manual / mostrador"
          />
        </div>
        <QuickAction
          href="/cierre"
          icon={<MoonStar className="size-4" />}
          title="Ir al cierre del día"
          subtitle={`Hoy: ${formatPrecio(gananciaEstimada)}`}
          valueColor={gananciaEstimada >= 0 ? "text-success" : "text-destructive"}
        />

        <Card className="overflow-hidden p-0 card-elevated">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent p-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="size-4 text-primary" />
              Pedidos activos
              {pedidosActivos.length > 0 ? (
                <span className="relative flex items-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                  <span className="relative ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {pedidosActivos.length}
                  </span>
                </span>
              ) : null}
            </CardTitle>
            <ButtonLink href="/pedidos/nuevo" size="sm">
              <Plus className="size-3.5" />
              Nuevo
            </ButtonLink>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-3">
            {pedidosActivos.length === 0 ? (
              <EmptyPedidos />
            ) : (
              pedidosActivos.map((p) => (
                <Link
                  key={p.id}
                  href="/pedidos"
                  className="group flex items-stretch gap-0 overflow-hidden rounded-xl border border-border bg-card hover-lift hover:border-primary/40"
                >
                  {p.items[0]?.imagenProducto ? (
                    <img
                      src={p.items[0].imagenProducto}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="size-16 shrink-0 object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-1.5 shrink-0",
                        p.estado === "pendiente" ? "bg-warning" : "bg-info",
                      )}
                      aria-hidden
                    />
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">
                        <span className="font-mono text-xs text-muted-foreground mr-1.5">#{p.numero}</span>
                        {p.nombreCliente}
                      </p>
                      <span className="font-heading font-semibold tabular-nums shrink-0">
                        {formatPrecio(p.total)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        {p.estado === "pendiente" ? (
                          <span className="size-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(255,179,0,0.7)]" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-info shadow-[0_0_8px_rgba(43,56,155,0.8)]" />
                        )}
                        {p.estado === "pendiente" ? "Pendiente" : "En cocina"}
                      </span>
                      <span>·</span>
                      <span>{formatHora(p.hora)}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {p.tipoEntrega === "delivery" ? (
                          <>
                            <Truck className="size-3" /> Delivery
                          </>
                        ) : (
                          "Retiro"
                        )}
                      </span>
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {stockBajo.length > 0 ? (
          <Card className="overflow-hidden p-0 border-warning/30 card-elevated">
            <CardHeader className="border-b border-warning/20 bg-gradient-to-r from-warning/10 to-transparent p-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="size-4" />
                Platos por reponer ({stockBajo.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-3 pt-3">
              {stockBajo.map((p) => (
                <Link
                  key={p.id}
                  href="/productos"
                  className="flex items-center gap-3 text-sm rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors"
                >
                  {p.imagen ? (
                    <img
                      src={p.imagen}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="size-8 shrink-0 rounded-md object-cover ring-1 ring-border"
                    />
                  ) : p.emoji ? (
                    <span className="size-8 shrink-0 grid place-items-center rounded-md bg-muted text-base">
                      {p.emoji}
                    </span>
                  ) : (
                    <span className="size-8 shrink-0 rounded-md bg-muted" aria-hidden />
                  )}
                  <span className="flex-1 truncate">{p.nombre}</span>
                  <span className="font-mono tabular-nums text-warning font-medium shrink-0">
                    {p.stockActual}
                    <span className="text-muted-foreground font-normal ml-1">
                      (mín {p.stockMinimo})
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden p-0 card-elevated">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-muted/30 to-transparent p-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ChefHat className="size-4 text-primary" />
              Tu día en números
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 divide-x divide-border p-0">
            <Mini label="Vendidos" value={itemsVendidos} />
            <Mini label="Pedidos" value={pedidosHoy.length} />
            <Mini label="Clientes" value={clientes.length} />
          </CardContent>
        </Card>

        <WeeklySummary />
      </main>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  gradient,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "positive" | "warning" | "danger" | "muted";
  gradient?: boolean;
  highlight?: boolean;
}) {
  const toneClass = {
    positive: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    muted: "text-foreground",
  }[tone];

  const iconBg = {
    positive: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-0 card-elevated",
        gradient && "bg-gradient-to-br from-card to-primary/5",
      )}
    >
      {highlight ? (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      ) : null}
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </span>
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", iconBg)}>
            {icon}
          </span>
        </div>
        <p className={cn("font-heading text-2xl font-bold tabular-nums leading-tight", toneClass)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  primary,
  valueColor,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
  valueColor?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-3 transition-all",
        primary
          ? "border-primary/40 bg-gradient-to-br from-brand/15 to-secondary/10 hover:border-primary hover:brand-glow"
          : "border-border bg-card hover-lift hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          primary
            ? "bg-gradient-to-br from-brand to-secondary text-primary-foreground brand-glow"
            : "bg-muted text-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{title}</p>
        <p className={cn("text-xs", valueColor ?? "text-muted-foreground")}>{subtitle}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center px-1 py-3">
      <p className="font-heading text-2xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">
        {label}
      </p>
    </div>
  );
}

function EmptyPedidos() {
  return (
    <div className="py-8 text-center">
      <svg
        viewBox="0 0 64 64"
        className="mx-auto size-16 text-muted-foreground/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="10" y="14" width="44" height="40" rx="4" />
        <path d="M10 24h44" />
        <path d="M20 8v8M44 8v8" />
        <circle cx="32" cy="40" r="2" fill="currentColor" />
      </svg>
      <p className="mt-3 text-sm text-muted-foreground">No hay pedidos activos</p>
      <p className="mt-0.5 text-xs text-muted-foreground/70">
        Tocá &ldquo;Nuevo&rdquo; arriba para crear uno
      </p>
    </div>
  );
}