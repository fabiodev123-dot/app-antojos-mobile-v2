# Antojos — Resumen Semanal de Ventas (Vista Read-Only)

> **Para Hermes:** Plan de implementación TDD, tasks bite-sized. Skill `plan` + `sketch` + `popular-web-designs` + `verify-script-recipe`.

**Goal:** Agregar al Dashboard una vista read-only de las ventas de los últimos 7 días (lunes a domingo) con total semanal, sin tocar la entidad `pedidos` ni romper la arquitectura actual. Es Quick Win: sirve para validar el diagnóstico con el cliente y resuelve el pedido 1 del "golazo semanal" sin asumir nada sobre la causa raíz del bug del pedido 2.

**Architecture:** Componente client-side que consume `useRepositoryList(pedidosRepository)`, agrupa por `fecha`, suma `total` de pedidos con `estado === "entregado" || "listo"` (igual que `page.tsx:48-50`). Renderiza una card con los últimos 7 días en formato lunes→domingo. Cero mutaciones, cero entidades nuevas, cero migraciones. Se puede sacar con `git revert` sin consecuencias.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui (base-nova). Sin nuevas deps.

---

## Contexto actual (verificado con código)

- `src/app/page.tsx:44` filtra pedidos por `p.fecha === today` (línea 44). Solo se ve "hoy".
- `src/app/page.tsx:48-50` calcula `ventasHoy` con `filter(estado === "entregado" || "listo")`.
- `src/lib/format.ts` ya tiene `formatPrecio`, `formatFechaCorta`, `formatFechaLarga`, `hoy()`.
- `useRepositoryList(pedidosRepository)` ya devuelve el array completo (no filtra por fecha).
- `Pedido.fecha` es `string` ISO (YYYY-MM-DD).
- `Pedido.total` es `number` (ARS enteros, sin centavos).
- `Pedido.estado` es union `'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado'`.

## Asunciones explícitas

- El lunes se considera el primer día de la semana (semana ISO 8601 — Argentina usa lun-dom en la práctica).
- "Ventas" = suma de `total` de pedidos con estado `entregado` o `listo` (consistente con `ventasHoy`).
- Si un día no tiene ventas, se muestra $0 con línea sutil.
- Si no hay NINGÚN pedido en los últimos 7 días, mostrar empty state ("Sin ventas esta semana").
- Hoy se muestra destacado (color o ring) y cuenta para el total.

## Out of scope (decisiones diferidas)

- No se crea nueva entidad `venta_rapida`. Eso se decide después de validar el diagnóstico con el cliente.
- No se toca el cierre diario (`/cierre`).
- No se migra a Supabase.
- No se agrega export PDF/Excel del resumen semanal.
- No se agrega drill-down de cada día (eso iría en una pantalla `/historial` aparte).

---

## Files likely to change

| Path | Acción |
|---|---|
| `src/lib/utils/week.ts` | Crear — helper puro: `getStartOfWeek(date)`, `getWeekDays(weekStart)`, `formatWeekLabel()`. Sin imports de React. |
| `src/lib/utils/week.test.ts` | Crear — tests del helper (Vitest). |
| `src/components/features/weekly-summary.tsx` | Crear — componente client que consume repo, agrupa, renderiza. |
| `src/app/page.tsx` | Modificar — agregar `<WeeklySummary />` entre el bloque "Tu día en números" y el final del `<main>`. |
| `vitest.config.ts` o setup | Verificar — confirmar que Vitest está configurado (sino agregar). |

## Files that will NOT change

- `src/lib/repositories/*` — los repos no se tocan.
- `src/lib/storage/*` — el storage no se toca.
- `src/lib/types/index.ts` — no se agregan tipos nuevos.
- `package.json` — no se agregan deps.

---

## Step-by-step plan

### Task 1: Verificar setup de Vitest

**Objective:** Confirmar que `npm test` corre Vitest sobre `*.test.ts` y que respeta el setup global.

**Files:**
- Read: `package.json`, `vitest.config.ts` (o equivalente).

**Step 1.** Buscar `vitest` en devDependencies y el script `test`.
**Step 2.** Si falta, instalar:
```bash
npm install -D vitest @vitest/ui
```
**Step 3.** Confirmar `npm test` corre.
**Step 4.** Commit condicional:
```bash
git add package.json package-lock.json
git commit -m "chore(test): ensure vitest is configured"
```
(Si Vitest ya estaba, skip este commit.)

---

### Task 2: Escribir helper `getStartOfWeek` con TDD

**Objective:** Helper puro que devuelve el lunes de la semana de una fecha dada, en formato ISO YYYY-MM-DD.

**Files:**
- Create: `src/lib/utils/week.ts`
- Create: `src/lib/utils/week.test.ts`

**Step 1: Escribir test fallando**

```ts
// src/lib/utils/week.test.ts
import { describe, it, expect } from "vitest";
import { getStartOfWeek, getWeekDays, formatWeekLabel } from "./week";

describe("getStartOfWeek", () => {
  it("devuelve el lunes de la misma semana (caso lunes)", () => {
    // 2026-08-17 es lunes
    expect(getStartOfWeek("2026-08-17")).toBe("2026-08-17");
  });
  it("devuelve el lunes anterior cuando es miércoles", () => {
    // 2026-08-19 es miércoles
    expect(getStartOfWeek("2026-08-19")).toBe("2026-08-17");
  });
  it("devuelve el lunes anterior cuando es domingo", () => {
    // 2026-08-23 es domingo
    expect(getStartOfWeek("2026-08-23")).toBe("2026-08-17");
  });
  it("maneja cambio de mes", () => {
    // 2026-09-02 es miércoles → lunes 2026-08-31
    expect(getStartOfWeek("2026-09-02")).toBe("2026-08-31");
  });
  it("maneja cambio de año", () => {
    // 2027-01-01 es viernes → lunes 2026-12-28
    expect(getStartOfWeek("2027-01-01")).toBe("2026-12-28");
  });
});
```

**Step 2: Correr y verificar que falla**

```bash
npm test -- src/lib/utils/week.test.ts
```

Expected: FAIL — "Cannot find module './week'".

**Step 3: Implementar mínimo**

```ts
// src/lib/utils/week.ts
/**
 * Devuelve el lunes (ISO YYYY-MM-DD) de la semana de la fecha dada.
 * Semana = lunes a domingo (ISO 8601).
 */
export function getStartOfWeek(isoDate: string): string {
  const d = new Date(isoDate.length === 10 ? isoDate + "T00:00:00" : isoDate);
  const day = d.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  const diff = day === 0 ? -6 : 1 - day; // ajustar domingo a -6
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
```

**Step 4: Correr y verificar que pasa**

```bash
npm test -- src/lib/utils/week.test.ts
```

Expected: PASS — 5/5.

**Step 5: Commit**

```bash
git add src/lib/utils/week.ts src/lib/utils/week.test.ts
git commit -m "feat(utils): add getStartOfWeek helper (lun-dom)"
```

---

### Task 3: Escribir helper `getWeekDays` con TDD

**Objective:** Devuelve array de 7 strings ISO (YYYY-MM-DD) de lunes a domingo, partiendo de un lunes dado.

**Files:**
- Modify: `src/lib/utils/week.test.ts`
- Modify: `src/lib/utils/week.ts`

**Step 1: Agregar tests**

```ts
describe("getWeekDays", () => {
  it("devuelve 7 días partiendo del lunes dado", () => {
    const days = getWeekDays("2026-08-17");
    expect(days).toEqual([
      "2026-08-17", // lunes
      "2026-08-18", // martes
      "2026-08-19", // miércoles
      "2026-08-20", // jueves
      "2026-08-21", // viernes
      "2026-08-22", // sábado
      "2026-08-23", // domingo
    ]);
  });
  it("atraviesa fin de mes", () => {
    const days = getWeekDays("2026-08-31");
    expect(days[6]).toBe("2026-09-06");
  });
});
```

**Step 2: Correr — FAIL**

```bash
npm test -- src/lib/utils/week.test.ts
```

**Step 3: Implementar**

```ts
export function getWeekDays(mondayIso: string): string[] {
  const result: string[] = [];
  const start = new Date(mondayIso.length === 10 ? mondayIso + "T00:00:00" : mondayIso);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}
```

**Step 4: Correr — PASS**

**Step 5: Commit**

```bash
git add src/lib/utils/week.ts src/lib/utils/week.test.ts
git commit -m "feat(utils): add getWeekDays helper"
```

---

### Task 4: Escribir helper `formatWeekLabel` con TDD

**Objective:** Devuelve string corto tipo "Lun 17 — Dom 23 ago".

**Files:**
- Modify: `src/lib/utils/week.test.ts`
- Modify: `src/lib/utils/week.ts`

**Step 1: Tests**

```ts
describe("formatWeekLabel", () => {
  it("formatea lunes a domingo del mismo mes", () => {
    expect(formatWeekLabel("2026-08-17")).toMatch(/lun.*17.*dom.*23.*ago/i);
  });
  it("formatea跨越 mes", () => {
    // lunes 31 ago → domingo 6 sep
    const label = formatWeekLabel("2026-08-31");
    expect(label.length).toBeGreaterThan(5);
  });
});
```

**Step 2: FAIL — correr**

**Step 3: Implementar**

```ts
const DAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatWeekLabel(mondayIso: string): string {
  const days = getWeekDays(mondayIso);
  const start = new Date(days[0] + "T00:00:00");
  const end = new Date(days[6] + "T00:00:00");
  const sameMonth = start.getMonth() === end.getMonth();
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  if (sameMonth) {
    return `${startDay}–${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}
```

**Step 4: PASS**

**Step 5: Commit**

```bash
git add src/lib/utils/week.ts src/lib/utils/week.test.ts
git commit -m "feat(utils): add formatWeekLabel helper"
```

---

### Task 5: Componente `WeeklySummary` — versión 1 (lectura pura)

**Objective:** Componente client que toma los pedidos, agrupa por día, muestra los últimos 7 días con total por día y total semanal.

**Files:**
- Create: `src/components/features/weekly-summary.tsx`

**Step 1: Implementar**

```tsx
"use client";

import { useMemo } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { useRepositoryList } from "@/hooks/use-repository";
import { pedidosRepository } from "@/lib/repositories";
import { getStartOfWeek, getWeekDays, formatWeekLabel } from "@/lib/utils/week";
import { formatPrecio, hoy } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_NAME_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type DaySummary = { fecha: string; total: number; count: number };

export function WeeklySummary() {
  const pedidos = useRepositoryList(pedidosRepository);
  const today = hoy();

  const { weekDays, days, weekTotal, weekCount, hasAnySales } = useMemo(() => {
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
      const acc = byDay.get(p.fecha)!;
      acc.total += p.total;
      acc.count += 1;
    }
    const days: DaySummary[] = weekDays.map((fecha) => ({
      fecha,
      total: byDay.get(fecha)!.total,
      count: byDay.get(fecha)!.count,
    }));
    const weekTotal = days.reduce((s, d) => s + d.total, 0);
    const weekCount = days.reduce((s, d) => s + d.count, 0);
    const hasAnySales = ventas.length > 0;
    return { weekDays, days, weekTotal, weekCount, hasAnySales };
  }, [pedidos, today]);

  return (
    <Card className="overflow-hidden p-0 card-elevated">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="size-4 text-primary" />
          Esta semana
        </CardTitle>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {formatWeekLabel(getStartOfWeek(today))}
        </span>
      </CardHeader>
      <CardContent className="p-3 pt-3 space-y-2">
        {hasAnySales ? (
          <>
            <ul className="divide-y divide-border/60">
              {days.map((d, i) => {
                const isToday = d.fecha === today;
                const dayNum = Number(d.fecha.slice(8, 10));
                return (
                  <li
                    key={d.fecha}
                    className={`flex items-center justify-between gap-2 py-1.5 ${
                      isToday ? "rounded-md bg-primary/5 px-2 -mx-2" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider w-7 shrink-0 ${
                          isToday ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {DAY_NAME_SHORT[i]}
                      </span>
                      <span
                        className={`tabular-nums text-sm ${
                          isToday ? "font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {d.count > 0 ? (
                        <span className="text-[10px] text-muted-foreground/70">
                          · {d.count} ped.
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`font-heading font-semibold tabular-nums text-sm shrink-0 ${
                        d.total > 0 ? "text-foreground" : "text-muted-foreground/40"
                      }`}
                    >
                      {formatPrecio(d.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                Total semana ({weekCount} ped.)
              </span>
              <span className="font-heading text-lg font-bold tabular-nums text-success">
                {formatPrecio(weekTotal)}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            Sin ventas esta semana todavía.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verificar tipos y lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 errores.

**Step 3: Commit**

```bash
git add src/components/features/weekly-summary.tsx
git commit -m "feat(dashboard): add WeeklySummary component (read-only)"
```

---

### Task 6: Integrar `WeeklySummary` en el Dashboard

**Objective:** Mostrar el componente en `/` entre el bloque "Tu día en números" y el final del main.

**Files:**
- Modify: `src/app/page.tsx:251-265` (entre el `Card stockBajo` y el `Card "Tu día en números"`, o después de este último según preferencia visual).

**Step 1: Editar**

En `src/app/page.tsx`, agregar el import después de los otros imports de componentes:

```ts
import { WeeklySummary } from "@/components/features/weekly-summary";
```

Y agregar el componente en el JSX, justo después del `<Card>` de "Tu día en números" (línea 265, antes del `</main>`):

```tsx
<WeeklySummary />
```

**Step 2: Verificar**

```bash
npx tsc --noEmit
npm run lint
```

**Step 3: Smoke test manual con `npm run dev`**

Levantar dev server, navegar a `/`, verificar:
- Aparece la card "Esta semana" debajo de "Tu día en números".
- Los 7 días aparecen (Lun, Mar, ..., Dom) con el día de hoy destacado.
- Si hay pedidos esta semana, los totales cuadran con la página `/pedidos` filtrada manualmente.
- Si no hay pedidos, aparece el empty state "Sin ventas esta semana todavía."

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(dashboard): integrate WeeklySummary component"
```

---

### Task 7: Validación end-to-end y ajustes

**Objective:** Probar con datos seed y con datos reales del cliente.

**Step 1.** `npm run dev` → verificar visualmente que la card se ve bien en mobile (375px) y desktop (≥1024px).
**Step 2.** Crear 1 pedido de prueba con estado "entregado" en una fecha de la semana actual → verificar que aparece el total.
**Step 3.** Cambiar el pedido a estado "cancelado" → verificar que desaparece del total (consistente con `ventasHoy`).
**Step 4.** Verificar que el total cuadra con `/cierre` para el día de hoy.
**Step 5.** Commit condicional si hubo ajustes:
```bash
git add .
git commit -m "fix(weekly-summary): ajustes visuales post-validación"
```

---

## Tests / validation

- **Unit tests:** `npm test -- src/lib/utils/week.test.ts` — 3 describe blocks, ~9 tests. Deben pasar todos.
- **Type check:** `npx tsc --noEmit` — 0 errores.
- **Lint:** `npm run lint` — 0 warnings/errors.
- **Build:** `npm run build` — debe completar sin errores.
- **Manual smoke:** la card aparece en `/`, los días cuadran con `/pedidos` + `/cierre`.

## Risks & trade-offs

1. **Riesgo bajo.** Read-only, no toca entidades. Reversible con `git revert`.
2. **Performance:** `useRepositoryList` ya cachea, `useMemo` evita recalcular si `pedidos` no cambia. Set de 7 strings es O(7), despreciable.
3. **Cambio de zona horaria:** si el cliente cruza medianoche, `hoy()` puede devolver otra fecha. La lógica de semana es determinística por fecha ISO, no por hora, así que es consistente.
4. **"Lunes" como inicio de semana:** Argentina es lun-dom en práctica cultural. Si el cliente prefiere dom-sáb, es 1 línea de cambio.
5. **Open questions para el cliente después de validar:**
   - ¿Usás el flujo de pedidos para anotar las ventas de la noche, o lo anotás en otro lado?
   - ¿Preferís la semana empezando lunes o domingo?
   - ¿Querés ver esto en el dashboard, o en una pantalla aparte `/historial`?

## Next steps (post-Quick-Win, NO incluidos en este plan)

- T1: Crear entidad `venta_rapida` (input 5-seg) si la respuesta del cliente confirma que no usa el flujo de pedidos.
- T2: Drill-down a pantalla `/historial` con últimos 30/90 días.
- T3: Export PDF/Excel del resumen semanal.
- T4: Migración completa a Supabase.
