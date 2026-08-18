"use client";

import { useMemo } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { useRepositoryList } from "@/hooks/use-repository";
import { pedidosRepository } from "@/lib/repositories";
import { getStartOfWeek, getWeekDays, formatWeekLabel } from "@/lib/utils/week";
import { formatPrecio, hoy } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_NAME_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

type DaySummary = {
  fecha: string;
  total: number;
  count: number;
};

/**
 * Resumen semanal de ventas — vista read-only.
 *
 * Muestra los 7 días de la semana actual (lunes a domingo) con el total
 * de ventas por día y el total semanal, leyendo de `pedidosRepository`.
 * No muta estado. No agrega entidades.
 *
 * Para el cálculo de "ventas" replica la lógica de `app/page.tsx`:
 * sólo cuentan pedidos con estado "entregado" o "listo" (los cerrados
 * que efectivamente generaron plata).
 */
export function WeeklySummary() {
  const pedidos = useRepositoryList(pedidosRepository);
  const today = hoy();

  const { days, weekTotal, weekCount, hasAnySales, weekNumber, maxTotal } = useMemo(() => {
    const monday = getStartOfWeek(today);
    const weekDays = getWeekDays(monday);
    const ventas = pedidos.filter(
      (p) =>
        weekDays.includes(p.fecha) &&
        (p.estado === "entregado" || p.estado === "listo"),
    );
    const byDay = new Map<string, { total: number; count: number }>();
    for (const d of weekDays) byDay.set(d, { total: 0, count: 0 });
    for (const p of ventas) {
      const acc = byDay.get(p.fecha);
      if (acc) {
        acc.total += p.total;
        acc.count += 1;
      }
    }
    const days: DaySummary[] = weekDays.map((fecha) => {
      const acc = byDay.get(fecha) ?? { total: 0, count: 0 };
      return { fecha, total: acc.total, count: acc.count };
    });
    const weekTotal = days.reduce((s, d) => s + d.total, 0);
    const weekCount = days.reduce((s, d) => s + d.count, 0);
    const maxTotal = Math.max(1, ...days.map((d) => d.total));
    const hasAnySales = ventas.length > 0;
    const weekNumber = getISOWeek(new Date(today + "T00:00:00"));
    return { days, weekTotal, weekCount, hasAnySales, weekNumber, maxTotal };
  }, [pedidos, today]);

  return (
    <Card className="overflow-hidden p-0 card-elevated">
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-3.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4 text-primary" />
            Esta semana
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Sem {weekNumber}
            </span>
          </CardTitle>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {formatWeekLabel(getStartOfWeek(today))}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Resumen de lunes a domingo
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {hasAnySales ? (
          <>
            <ul className="divide-y divide-border/60">
              {days.map((d, i) => {
                const isToday = d.fecha === today;
                const dayNum = Number(d.fecha.slice(8, 10));
                const widthPct = d.total > 0 ? (d.total / maxTotal) * 100 : 0;
                return (
                  <li
                    key={d.fecha}
                    className={`flex items-center gap-3 px-3.5 py-2.5 ${
                      isToday ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        isToday
                          ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(255,204,0,0.5)]"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <span className="leading-none">{DAY_NAME_SHORT[i]}</span>
                      <span
                        className={`mt-0.5 text-[13px] font-extrabold leading-none ${
                          isToday ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[11px] leading-tight ${
                          isToday ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {d.count > 0
                          ? `${d.count} ${d.count === 1 ? "pedido" : "pedidos"}${isToday ? " · hoy" : ""}`
                          : isToday
                            ? "Sin ventas hoy"
                            : "Sin pedidos"}
                      </p>
                      {d.total > 0 ? (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/40">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 font-heading tabular-nums text-sm font-bold ${
                        d.total > 0 ? "text-foreground" : "text-muted-foreground/40"
                      }`}
                    >
                      {formatPrecio(d.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mx-3.5 mt-2 mb-3.5 flex items-center justify-between gap-2 rounded-lg border border-success/20 bg-success/8 p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <TrendingUp className="size-3 text-success" />
                  Total semana
                </span>
                <span className="text-[11px] text-success font-medium">
                  {weekCount} {weekCount === 1 ? "pedido cerrado" : "pedidos cerrados"}
                </span>
              </div>
              <span className="font-heading text-xl font-extrabold tabular-nums text-success">
                {formatPrecio(weekTotal)}
              </span>
            </div>
          </>
        ) : (
          <p className="px-3.5 py-5 text-sm text-muted-foreground text-center">
            Sin ventas esta semana todavía.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Devuelve el número de semana ISO 8601 (1-53) de una fecha.
 * Auxiliar usado solo por este componente, no se exporta a `lib/utils`.
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
