"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RevenueTrendPoint } from "@/lib/services/admin-service";

const WIDTH = 800;
const HEIGHT = 220;
const PADDING_X = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export function RevenueTrendCard({ data }: { data: RevenueTrendPoint[] }) {
  const view = useMemo(() => {
    if (data.length === 0) {
      return null;
    }

    const max = Math.max(
      1,
      ...data.flatMap((d) => [d.pedidosTotal, d.ventasRapidasTotal]),
    );

    const innerWidth = WIDTH - PADDING_X * 2;
    const innerHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    const xStep = data.length > 1 ? innerWidth / (data.length - 1) : 0;

    const pointAt = (i: number, value: number) => ({
      x: PADDING_X + i * xStep,
      y: PADDING_TOP + (1 - value / max) * innerHeight,
    });

    const toPath = (values: number[]) =>
      values
        .map((v, i) => {
          const p = pointAt(i, v);
          return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        })
        .join(" ");

    const toArea = (values: number[]) => {
      const first = pointAt(0, 0);
      const last = pointAt(values.length - 1, 0);
      const linePath = toPath(values);
      return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ${linePath
        .replace(/^M /, "L ")
        .split(" L ")
        .map((seg, i) => (i === 0 ? `L ${seg.split(" ")[1]}` : seg))
        .join(" L ")} L ${last.x.toFixed(1)} ${last.y.toFixed(1)} Z`;
    };

    const pedidosPath = toPath(data.map((d) => d.pedidosTotal));
    const ventasPath = toPath(data.map((d) => d.ventasRapidasTotal));
    const pedidosArea = toArea(data.map((d) => d.pedidosTotal));
    const ventasArea = toArea(data.map((d) => d.ventasRapidasTotal));

    const last = data[data.length - 1]!;
    const lastPedidos = pointAt(data.length - 1, last.pedidosTotal);
    const lastVentas = pointAt(data.length - 1, last.ventasRapidasTotal);

    const totalPedidos = data.reduce((s, d) => s + d.pedidosTotal, 0);
    const totalVentas = data.reduce((s, d) => s + d.ventasRapidasTotal, 0);
    const hasData = totalPedidos > 0 || totalVentas > 0;

    const xLabels: Array<{ x: number; label: string }> = [];
    const labelCount = Math.min(6, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      const p = pointAt(idx, 0);
      const dayNum = Number(data[idx]!.fecha.slice(8, 10));
      xLabels.push({ x: p.x, label: String(dayNum) });
    }

    return {
      max,
      totalPedidos,
      totalVentas,
      hasData,
      pedidosPath,
      ventasPath,
      pedidosArea,
      ventasArea,
      lastPedidos,
      lastVentas,
      xLabels,
    };
  }, [data]);

  if (!view || !view.hasData) {
    return (
      <Card className="p-0 card-elevated">
        <CardHeader className="border-b border-border/60 p-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="text-primary size-4" />
            Revenue últimos 30 días
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Sin ventas en los últimos 30 días.
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
              <TrendingUp className="text-primary size-4" />
              Revenue últimos 30 días
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Pedidos cerrados + ventas rápidas
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Legend
              color="var(--color-primary)"
              label="Pedidos"
              value={view.totalPedidos}
            />
            <Legend
              color="var(--color-secondary)"
              label="Rápidas"
              value={view.totalVentas}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-2">
        <div className="w-full">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="h-44 w-full"
            role="img"
            aria-label="Revenue trend de los últimos 30 días"
          >
            <defs>
              <linearGradient id="ds-area-pedidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6600" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ds-area-ventas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffcc00" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffcc00" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((p) => (
              <line
                key={p}
                x1={PADDING_X}
                x2={WIDTH - PADDING_X}
                y1={PADDING_TOP + p * (HEIGHT - PADDING_TOP - PADDING_BOTTOM)}
                y2={PADDING_TOP + p * (HEIGHT - PADDING_TOP - PADDING_BOTTOM)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2 4"
              />
            ))}

            <path d={view.pedidosArea} fill="url(#ds-area-pedidos)" />
            <path d={view.ventasArea} fill="url(#ds-area-ventas)" />

            <path
              d={view.pedidosPath}
              fill="none"
              stroke="#ff6600"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={view.ventasPath}
              fill="none"
              stroke="#ffcc00"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx={view.lastPedidos.x}
              cy={view.lastPedidos.y}
              r="3"
              fill="#ff6600"
            />
            <circle
              cx={view.lastVentas.x}
              cy={view.lastVentas.y}
              r="3"
              fill="#ffcc00"
            />

            {view.xLabels.map((l, i) => (
              <text
                key={i}
                x={l.x}
                y={HEIGHT - 8}
                fill="rgba(176,176,176,0.6)"
                fontSize="10"
                textAnchor="middle"
                fontFamily="var(--font-geist-mono)"
              >
                {l.label}
              </text>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-heading font-semibold tabular-nums">
        {formatPrecio(value)}
      </span>
    </div>
  );
}