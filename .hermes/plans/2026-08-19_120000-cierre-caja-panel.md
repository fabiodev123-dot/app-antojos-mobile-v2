# Cierre de Caja por Período (Día/Semana/Mes) — Panel

> **Para Hermes:** Ejecutar paso a paso con TDD. Use el patrón del repositorio: cada tarea = 1 commit, RED→GREEN→REFACTOR.

**Goal:** Convertir la página `/cierre` actual en una vista tabbed con tres períodos (Día/Semana/Mes) que muestre balance + top productos vendidos. Mantener todo lo existente intacto y agregar tabs sin tocar la lógica del cierre diario.

**Architecture:** El cierre diario sigue existiendo como tab por defecto (comportamiento actual). Las otras dos pestañas son **read-only agregadas**: funciones puras sobre repos que ya tenemos. Sin nueva tabla, sin nueva migración, sin repos nuevos. La persistencia del cierre diario V1 sigue siendo el botón "Guardar cierre del día" que está en su tab.

**Tech Stack:** Next.js 16 (App Router) + React 19 + shadcn/ui v4 (base-ui tabs ya instalado) + Tailwind v4 + Vitest + Zod 4 + Repository pattern + localStorage/Supabase (ambos, vía el factory existente).

**Decisiones de diseño locked:**
- Tabs `Día | Semana | Mes` arriba del contenido actual. Variant="line".
- Tab Día = comportamiento actual sin tocar (incluye botón guardar).
- Tab Semana y Mes = read-only: balance + breakdown + tabla top productos.
- Selector del período al lado del header del tab (chevrons para semana, chips para mes, fecha actual para día).
- Top productos como **tabla con barras horizontales**, NO cards de producto (anti-pattern de impeccable).
- Una sola card "Balance" sin hero-metric. Tabular-nums en cifras. Sin gradientes, sin glassmorphism, sin side-stripes, sin modal como first thought.
- EmptyState reutilizado del proyecto (`EmptyState icon="boxes"`).
- Función pura reusable: `topProductosPorPeriodo` y `resumenPorPeriodo` + `parsePeriodo` (helpers de fecha).

**Contraints sagradas (NO romper):**
- Cero cambios a `src/app/cierre/page.tsx` actual en esta iteración (la pestaña Día lo envuelve).
- Cero migraciones DB nuevas.
- Cero dependencias nuevas en `package.json`.
- Cero cambios en `src/lib/repositories/index.ts`.
- `npm run verify` debe pasar (tsc + eslint + vitest).
- Respeta AGENTS.md del proyecto real (que está vacío para esta app, pero uso las convenciones leídas del README + cierre actual).

---

## Branching
Ya estás en `feat/cierre-caja-panel` desde main. Stash con cambios de `feat/client-feedback-q3` sigue aparte.

---

## Task 1: Helpers de período (parsePeriodo + bounds)

**Objective:** Funciones puras que conviertan un período en `[from, to]`. Lo más simple posible.

**Files:**
- Create: `src/lib/utils/cierre-period.ts`
- Test: `src/lib/utils/cierre-period.test.ts`

**Step 1: Tests RED**

```ts
import { describe, expect, it } from "vitest";
import { parsePeriodo, getPeriodBounds, type Periodo } from "./cierre-period";

describe("parsePeriodo", () => {
  it.each([
    ["DIA", "DIA"],
    ["dia", "DIA"],
    ["semana", "SEMANA"],
    ["MES", "MES"],
  ] as const)("'%s' → '%s'", (input, expected) => {
    expect(parsePeriodo(input as string)).toBe(expected);
  });
  it("lanza para valor inválido", () => {
    expect(() => parsePeriodo("foo")).toThrow();
  });
});

describe("getPeriodBounds", () => {
  it("DIA: from y to son el mismo día", () => {
    const { from, to } = getPeriodBounds("DIA", "2026-08-19");
    expect(from).toBe("2026-08-19");
    expect(to).toBe("2026-08-19");
  });
  it("SEMANA: lunes a domingo (Arg locale)", () => {
    // 2026-08-19 = miércoles
    const { from, to } = getPeriodBounds("SEMANA", "2026-08-19");
    expect(from).toBe("2026-08-17"); // lunes
    expect(to).toBe("2026-08-23");   // domingo
  });
  it("MES: primer y último día del mes", () => {
    const { from, to } = getPeriodBounds("MES", "2026-08-19");
    expect(from).toBe("2026-08-01");
    expect(to).toBe("2026-08-31");
  });
});
```

**Step 2:** `npm test -- --run cierre-period` → Expected: FAIL — "cannot find module".

**Step 3: Implementación GREEN mínima**

```ts
export type Periodo = "DIA" | "SEMANA" | "MES";

export function parsePeriodo(value: string): Periodo {
  const up = value.toUpperCase();
  if (up === "DIA" || up === "SEMANA" || up === "MES") return up;
  throw new Error(`Período inválido: ${value}`);
}

export interface PeriodBounds { from: string; to: string; }

export function getPeriodBounds(periodo: Periodo, refIso: string): PeriodBounds {
  const [y, m, d] = refIso.split("-").map(Number);
  const ref = new Date(y, m - 1, d); // local

  if (periodo === "DIA") {
    return { from: refIso, to: refIso };
  }
  if (periodo === "SEMANA") {
    // Lunes = 1, domingo = 0
    const dow = ref.getDay();
    const offsetToMonday = (dow + 6) % 7;
    const monday = new Date(ref); monday.setDate(ref.getDate() - offsetToMonday);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { from: toIso(monday), to: toIso(sunday) };
  }
  // MES
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { from: toIso(first), to: toIso(last) };
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

**Step 4:** `npm test -- --run cierre-period` → PASS.

**Step 5: Commit**
```bash
git add src/lib/utils/cierre-period.ts src/lib/utils/cierre-period.test.ts
git commit -m "feat(cierre-period): helpers puros getPeriodBounds + parsePeriodo con TDD"
```

---

## Task 2: resumenPorPeriodo (agregado de ventas y gastos)

**Objective:** Función pura que devuelve el balance para un período, filtrando pedidos cerrados (= `entregado` o `listo`, replicando la lógica del cierre diario).

**Files:**
- Modify: `src/lib/utils/cierre-period.ts`
- Modify: `src/lib/utils/cierre-period.test.ts`

**Step 1: Tests RED (agregar)**

```ts
describe("resumenPorPeriodo", () => {
  it("cuenta solo pedidos entregados o listos en el rango", () => {
    const pedidos = [
      mkPedido({ fecha: "2026-08-18", total: 1000, estado: "entregado" }),
      mkPedido({ fecha: "2026-08-19", total: 2000, estado: "entregado" }),
      mkPedido({ fecha: "2026-08-19", total: 9999, estado: "cancelado" }), // fuera
      mkPedido({ fecha: "2026-08-20", total: 3000, estado: "listo" }),
      mkPedido({ fecha: "2026-08-19", total: 1500, estado: "preparando" }), // abierto
    ];
    const gastos = [
      mkGasto({ fecha: "2026-08-19", monto: 500 }),
      mkGasto({ fecha: "2026-08-18", monto: 200 }),
    ];
    const r = resumenPorPeriodo(pedidos, gastos, { from: "2026-08-19", to: "2026-08-19" });
    expect(r.totalVentas).toBe(2000);
    expect(r.cantidadPedidos).toBe(1);
    expect(r.totalGastos).toBe(500);
    expect(r.balance).toBe(1500);
  });
  it("balance puede ser negativo", () => {
    const r = resumenPorPeriodo([], [mkGasto({ fecha: "2026-08-19", monto: 1000 })], { from: "2026-08-19", to: "2026-08-19" });
    expect(r.balance).toBe(-1000);
  });
});
```

**Step 2:** Tests FAIL.

**Step 3: Implementación**

```ts
import type { Pedido, Gasto } from "@/lib/types";

export interface ResumenPeriodo {
  totalVentas: number;
  cantidadPedidos: number;
  totalGastos: number;
  balance: number;
}

export function resumenPorPeriodo(
  pedidos: Pedido[],
  gastos: Gasto[],
  bounds: PeriodBounds,
): ResumenPeriodo {
  const enRango = (fecha: string) => fecha >= bounds.from && fecha <= bounds.to;
  const pedidosCerrados = pedidos.filter(
    (p) => (p.estado === "entregado" || p.estado === "listo") && enRango(p.fecha),
  );
  const gastosEnRango = gastos.filter((g) => enRango(g.fecha));
  const totalVentas = pedidosCerrados.reduce((s, p) => s + p.total, 0);
  const cantidadPedidos = pedidosCerrados.length;
  const totalGastos = gastosEnRango.reduce((s, g) => s + g.monto, 0);
  return { totalVentas, cantidadPedidos, totalGastos, balance: totalVentas - totalGastos };
}
```

(Agregar también los helpers `mkPedido`/`mkGasto` en el test).

**Step 4:** PASS.

**Step 5: Commit**
```bash
git commit -am "feat(cierre-period): resumenPorPeriodo agrega ventas/gastos en rango"
```

---

## Task 3: topProductosPorPeriodo (ranking)

**Objective:** Función pura que agrupa items vendidos en el rango y devuelve top N por unidades y por ingresos.

**Files:**
- Modify: `src/lib/utils/cierre-period.ts`
- Modify: `src/lib/utils/cierre-period.test.ts`

**Step 1: Tests RED**

```ts
describe("topProductosPorPeriodo", () => {
  it("agrupa por producto y suma cantidad e ingresos", () => {
    const pedidos = [
      mkPedido({ fecha: "2026-08-19", estado: "entregado", items: [
        mkItem({ productoId: "p1", nombreProducto: "A", cantidad: 2, subtotal: 1000 }),
        mkItem({ productoId: "p2", nombreProducto: "B", cantidad: 1, subtotal: 800 }),
      ]}),
      mkPedido({ fecha: "2026-08-19", estado: "listo", items: [
        mkItem({ productoId: "p1", nombreProducto: "A", cantidad: 3, subtotal: 1500 }),
      ]}),
    ];
    const tops = topProductosPorPeriodo(pedidos, { from: "2026-08-19", to: "2026-08-19" });
    expect(tops.porUnidades[0]).toMatchObject({ productoId: "p1", unidades: 5, ingresos: 2500 });
    expect(tops.porIngresos[0]).toMatchObject({ productoId: "p1", unidades: 5, ingresos: 2500 });
  });
  it("ignora pedidos cancelados y fuera de rango", () => {
    const pedidos = [
      mkPedido({ fecha: "2026-08-19", estado: "cancelado", items: [mkItem({ productoId: "p1", nombreProducto: "A", cantidad: 999, subtotal: 999999 })] }),
      mkPedido({ fecha: "2026-08-18", estado: "entregado", items: [mkItem({ productoId: "p1", nombreProducto: "A", cantidad: 1, subtotal: 100 })] }),
    ];
    const tops = topProductosPorPeriodo(pedidos, { from: "2026-08-19", to: "2026-08-19" });
    expect(tops.porUnidades).toHaveLength(0);
  });
});
```

**Step 2:** Tests FAIL.

**Step 3: Implementación**

```ts
export interface TopProducto {
  productoId: string;
  nombre: string;
  unidades: number;
  ingresos: number;
}

export interface TopProductos {
  porUnidades: TopProducto[];
  porIngresos: TopProducto[];
}

export function topProductosPorPeriodo(
  pedidos: Pedido[],
  bounds: PeriodBounds,
  limit = 5,
): TopProductos {
  const enRango = (f: string) => f >= bounds.from && f <= bounds.to;
  const acc = new Map<string, TopProducto>();
  for (const p of pedidos) {
    if (!(p.estado === "entregado" || p.estado === "listo")) continue;
    if (!enRango(p.fecha)) continue;
    for (const it of p.items) {
      const ex = acc.get(it.productoId);
      if (ex) {
        ex.unidades += it.cantidad;
        ex.ingresos += it.subtotal;
      } else {
        acc.set(it.productoId, {
          productoId: it.productoId,
          nombre: it.nombreProducto,
          unidades: it.cantidad,
          ingresos: it.subtotal,
        });
      }
    }
  }
  const all = [...acc.values()];
  const porUnidades = [...all].sort((a, b) => b.unidades - a.unidades).slice(0, limit);
  const porIngresos = [...all].sort((a, b) => b.ingresos - a.ingresos).slice(0, limit);
  return { porUnidades, porIngresos };
}
```

**Step 4:** PASS.

**Step 5: Commit**
```bash
git commit -am "feat(cierre-period): topProductosPorPeriodo con ranking doble"
```

---

## Task 4: Schema Zod del módulo (placeholder para futuro `cierre_periodo`)

**Objective:** Tipo discriminated union para serializar un snapshot por período. **NO se persiste todavía** — es solo para tipar si en el futuro alguien quiere guardar cierres semanales/mensuales.

**Files:**
- Create: `src/lib/schemas/cierre-periodo.ts`

**Step 1: Implementación directa** (sin test — solo tipos)

```ts
import { z } from "zod";
import { baseEntitySchema } from "./entities";

export const periodoSchema = z.enum(["DIA", "SEMANA", "MES"]);

export const cierrePeriodoSchema = baseEntitySchema.extend({
  periodo: periodoSchema,
  fechaInicio: z.string(),
  fechaFin: z.string(),
  totalVentas: z.number().nonnegative(),
  cantidadPedidos: z.number().nonnegative(),
  totalGastos: z.number().nonnegative(),
  balance: z.number(),
  notas: z.string().optional(),
});

export type CierrePeriodo = z.infer<typeof cierrePeriodoSchema>;
export type Periodo = z.infer<typeof periodoSchema>;
```

**Step 2:** Agregar export en `src/lib/schemas/index.ts`:
```bash
echo "export * from \"./cierre-periodo\";" >> src/lib/schemas/index.ts
```

**Step 3:** `npx tsc --noEmit` → PASS. `npm run lint` → PASS.

**Step 4: Commit**
```bash
git add src/lib/schemas/cierre-periodo.ts src/lib/schemas/index.ts
git commit -m "feat(schemas): cierrePeriodoSchema para futuro snapshot por período"
```

---

## Task 5: Hook reactivo `useCierrePeriodo`

**Objective:** Hook que lee pedidos + gastos del repo reactivo y delega a las funciones puras cuando cambia el período.

**Files:**
- Create: `src/modules/cierre-period/hooks/use-cierre-periodo.ts`

**Step 1: Implementación directa**

```ts
"use client";

import { useMemo, useState, useCallback } from "react";
import { useRepositoryList } from "@/hooks/use-repository";
import {
  gastosRepository,
  pedidosRepository,
} from "@/lib/repositories";
import {
  getPeriodBounds,
  resumenPorPeriodo,
  topProductosPorPeriodo,
  type Periodo,
} from "@/lib/utils/cierre-period";
import { hoy } from "@/lib/format";

export function useCierrePeriodo(initialPeriodo: Periodo = "DIA") {
  const [periodo, setPeriodo] = useState<Periodo>(initialPeriodo);
  const [refIso, setRefIso] = useState<string>(hoy());

  const pedidos = useRepositoryList(pedidosRepository);
  const gastos = useRepositoryList(gastosRepository);

  const bounds = useMemo(
    () => getPeriodBounds(periodo, refIso),
    [periodo, refIso],
  );

  const resumen = useMemo(
    () => resumenPorPeriodo(pedidos, gastos, bounds),
    [pedidos, gastos, bounds],
  );

  const top = useMemo(
    () => topProductosPorPeriodo(pedidos, bounds),
    [pedidos, bounds],
  );

  const navegar = useCallback((delta: number) => {
    setRefIso((cur) => {
      const d = new Date(cur + "T00:00:00");
      if (periodo === "DIA") d.setDate(d.getDate() + delta);
      else if (periodo === "SEMANA") d.setDate(d.getDate() + delta * 7);
      else d.setMonth(d.getMonth() + delta);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    });
  }, [periodo]);

  return { periodo, setPeriodo, refIso, setRefIso, bounds, resumen, top, navegar };
}
```

**Step 2:** Verificar que `useRepositoryList` ya existe y exporta la signature esperada (sí — leída en page.tsx línea 50).

**Step 3:** `npx tsc --noEmit` → PASS.

**Step 4: Commit**
```bash
git commit -am "feat(cierre-period): hook useCierrePeriodo (memo + navegar)"
```

---

## Task 6: Componente PeriodSelector (chevrons/chips)

**Objective:** Selector genérico de período según el modo (chevrones para semana, chips para mes, fecha legible para día).

**Files:**
- Create: `src/modules/cierre-period/components/PeriodSelector.tsx`

**Step 1: Implementación** (Server component friendly, pero interactividad obliga a client por navegate handler)

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Periodo } from "@/lib/utils/cierre-period";
import { formatFechaLarga } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PeriodSelectorProps {
  periodo: Periodo;
  refIso: string;
  bounds: { from: string; to: string };
  onNavigate: (delta: number) => void;
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function PeriodSelector({ periodo, refIso, bounds, onNavigate }: PeriodSelectorProps) {
  if (periodo === "MES") {
    const [y, m] = bounds.from.split("-");
    const idx = Number(m) - 1;
    return (
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2 font-heading text-sm font-semibold tabular-nums">
          <span>{MESES[idx]}</span>
          <span className="text-muted-foreground">{y}</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  if (periodo === "SEMANA") {
    return (
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-heading text-sm font-semibold tabular-nums">
          {formatFechaCorta(bounds.from)} – {formatFechaCorta(bounds.to)}
        </span>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  // DIA: input type=date como mejora futura — por ahora solo refIso
  return (
    <div className="mt-4 rounded-xl border border-border bg-card px-4 py-2.5 text-center text-sm tabular-nums">
      {formatFechaLarga(refIso)}
    </div>
  );
}

function formatFechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(
    iso.length === 10 ? new Date(iso + "T00:00:00") : new Date(iso),
  );
}
```

**Step 2:** `npx tsc --noEmit` → PASS. `npm run lint` → PASS.

**Step 3: Commit**
```bash
git commit -am "feat(cierre-period): PeriodSelector adaptativo (chevrons/mes)"
```

---

## Task 7: Componente BalanceCard (no-hero, anti-pattern)

**Objective:** Una sola card con tres cifras y un breakdown opcional. Sigue el "anti hero-metric" de impeccable.

**Files:**
- Create: `src/modules/cierre-period/components/BalanceCard.tsx`

**Step 1: Implementación**

```tsx
import { Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrecio } from "@/lib/format";
import type { ResumenPeriodo } from "@/lib/utils/cierre-period";

interface BalanceCardProps {
  periodoLabel: string;
  resumen: ResumenPeriodo;
}

export function BalanceCard({ periodoLabel, resumen }: BalanceCardProps) {
  const positivo = resumen.balance >= 0;
  return (
    <Card className="overflow-hidden p-0 card-elevated border-primary/20">
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          Balance
          <span className="ml-auto text-xs font-normal text-muted-foreground">{periodoLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <div className="grid grid-cols-3 gap-3">
          <Figure label="Ventas" value={formatPrecio(resumen.totalVentas)} className="text-success" />
          <Figure label="Gastos" value={formatPrecio(resumen.totalGastos)} className="text-destructive" />
          <Figure
            label={positivo ? "Ganancia" : "Pérdida"}
            value={formatPrecio(Math.abs(resumen.balance))}
            className={positivo ? "text-success" : "text-destructive"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-heading text-[1.05rem] font-bold tabular-nums ${className ?? ""}`}>{value}</div>
    </div>
  );
}
```

**Step 2:** `npx tsc --noEmit` → PASS.

**Step 3: Commit**
```bash
git commit -am "feat(cierre-period): BalanceCard no-hero con 3 cifras"
```

---

## Task 8: Componente TopProductosTable (tabla con barras)

**Objective:** Tabla compacta con barras horizontales para "lo más vendido" — sin cards repetidas.

**Files:**
- Create: `src/modules/cierre-period/components/TopProductosTable.tsx`

```tsx
import { EmptyState } from "@/components/features/empty-state";
import type { TopProducto } from "@/lib/utils/cierre-period";

interface TopProductosTableProps {
  titulo: string;
  unidades: boolean;
  items: TopProducto[];
}

export function TopProductosTable({ titulo, unidades, items }: TopProductosTableProps) {
  if (items.length === 0) {
    return <EmptyState icon="boxes" title="Sin datos en el período" />;
  }
  const max = Math.max(...items.map((it) => (unidades ? it.unidades : it.ingresos)));
  return (
    <section className="mt-6">
      <h3 className="font-heading text-sm font-semibold">{titulo}</h3>
      <ol className="mt-2 flex flex-col">
        {items.map((it, i) => {
          const v = unidades ? it.unidades : it.ingresos;
          const pct = max === 0 ? 0 : Math.round((v / max) * 100);
          return (
            <li
              key={it.productoId}
              className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0"
            >
              <span className="text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{it.nombre}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-1 w-9 overflow-hidden rounded-full bg-white/5">
                    <span className="block h-full bg-secondary" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="tabular-nums">{unidades ? `${it.unidades} u` : `${it.ingresos.toLocaleString("es-AR")} u`}</span>
                </div>
              </div>
              <span className="font-heading text-sm font-semibold tabular-nums">
                {unidades ? it.unidades : it.ingresos.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

Commit: `feat(cierre-period): TopProductosTable con barras horizontales`.

---

## Task 9: Página `/cierre` envuelta con tabs

**Objective:** Modificar `src/app/cierre/page.tsx` para envolver el contenido actual en un Tab "Día" y agregar tabs "Semana" y "Mes" con los componentes nuevos. **NO romper** el comportamiento actual.

**Files:**
- Modify: `src/app/cierre/page.tsx` — agregar `<Tabs>` de shadcn. Mover todo el contenido actual dentro de `<TabsContent value="dia">`. Agregar `<TabsContent value="semana">` con BalanceCard + PeriodSelector + TopProductosTable. Idem "mes".
- Create: `src/modules/cierre-period/components/CierrePeriodoPanel.tsx` (compose los componentes).
- Create: `src/modules/cierre-period/index.ts` (barrel export).

**Step 1: Implementación de `CierrePeriodoPanel.tsx`**

```tsx
"use client";

import { useCierrePeriodo } from "./hooks/use-cierre-periodo";
import { BalanceCard } from "./components/BalanceCard";
import { PeriodSelector } from "./components/PeriodSelector";
import { TopProductosTable } from "./components/TopProductosTable";
import type { Periodo } from "@/lib/utils/cierre-period";
import { formatFechaLarga } from "@/lib/format";

export function CierrePeriodoPanel({ initialPeriodo }: { initialPeriodo: Periodo }) {
  const { periodo, setPeriodo, bounds, resumen, top, navegar, refIso } = useCierrePeriodo(initialPeriodo);

  const labelPeriodo =
    periodo === "DIA" ? formatFechaLarga(refIso) :
    periodo === "SEMANA" ? "7 días" :
    "Mes completo";

  return (
    <div className="space-y-4">
      <BalanceCard periodoLabel={labelPeriodo} resumen={resumen} />
      <PeriodSelector periodo={periodo} refIso={refIso} bounds={bounds} onNavigate={navegar} />
      <TopProductosTable titulo="Lo más vendido por unidades" unidades items={top.porUnidades} />
      <TopProductosTable titulo="Lo más vendido por ingresos" unidades={false} items={top.porIngresos} />
    </div>
  );
}
```

**Step 2:** Modificar `page.tsx` — agregar imports + envolver

(Ver patch completo en la rama — agregar `<Tabs defaultValue="dia">` + `<TabsList>` + tres `<TabsContent>` que envuelvan el contenido actual y los nuevos paneles)

**Step 3:** `npx tsc --noEmit` → PASS.
**Step 4:** `npm run lint` → PASS.
**Step 5:** `npm test -- --run` → todos pasan.

**Step 6: Commit**
```bash
git commit -am "feat(cierre): /cierre con tabs Día/Semana/Mes (panel periodo)"
```

---

## Task 10: Verify final + commit

**Pasos:**
```bash
npx tsc --noEmit     # debe pasar
npm run lint         # cero warnings
npm test -- --run    # todos los tests pasan
```

Si algo falla, fix root cause + volver a correr.

**NO usar `npm run build`** (rompe Turbopack según AGENTS.md si aplicara; en este proyecto no vi el aviso, pero no es necesario para verificar).

---

## Notas sobre cambios fuera de scope (NO aplicar)

- ❌ No migrar a `cierre_periodo` DB (diferido a Otra iteración)
- ❌ No tocar `src/app/cierre/page.tsx` lógica del cierre diario (solo wrappear con tabs)
- ❌ No exportar semanal/mensual en PDF/Excel (lo hace el usuario si lo pide)
- ❌ No agregar comparativa con período anterior (diferido)
- ❌ No tocar `feat/client-feedback-q3` stash

## Risks

- **Riesgo 1: tabs rompe el flujo actual del cierre diario.**
  Mitigación: el contenido actual va dentro de `<TabsContent value="dia" forceMount>` solo si es necesario; en caso contrario, mount por default y listo.
- **Riesgo 2: semana calculada en local puede diferir si la app está hosteada.**
  Mitigación: usamos `new Date(y, m, d)` (local) — aceptable para esta app single-tenant, mobile-first. Documentar.
- **Riesgo 3: ventas_rapidas no entran en top productos.**
  Aceptado en este iteration: `topProductosPorPeriodo` solo mira items de pedidos. `ventasRapidas` son agregados sin detalle de producto. Diferido a iteración futura.
