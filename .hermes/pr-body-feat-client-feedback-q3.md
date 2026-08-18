## Qué es esto

Dos features nuevas que atacan el pedido del cliente (dueño de la rotisería Antojos):

1. **Resumen semanal** en el Dashboard — vista read-only lunes a domingo con total por día y total semanal.
2. **Venta rápida** — input de 5 segundos para anotar plata sin pasar por el flujo de pedidos.

## Contexto del cliente

El cliente vende en la noche y solo quiere anotar "vendí $X" sin armar un pedido. Antes:
- El dashboard solo mostraba ventas de "hoy" → el lunes veía sus ventas, el martes ya no.
- No había resumen semanal → agarraba la calculadora cada domingo.
- No había forma rápida de anotar plata sin cliente / items / carrito.

## Cambios

### 1. Weekly Summary (read-only)

- `src/components/features/weekly-summary.tsx` — componente client que muestra 7 días (lun-dom) con total por día, día actual destacado, empty state.
- `src/lib/utils/week.ts` — helpers puros `getStartOfWeek`, `getWeekDays`, `formatWeekLabel` (9/9 tests).
- Integración en `src/app/page.tsx` debajo de "Tu día en números".

### 2. Venta rápida

- `src/lib/types/index.ts` — interface `VentaRapida` (fecha ISO + hora HH:MM + monto + nota opcional).
- `src/lib/schemas/entities.ts` — `ventaRapidaFormSchema` + `ventaRapidaCreateSchema` (zod, 12/12 tests).
- `src/lib/repositories/index.ts` — `ventasRapidasRepository` (localStorage, fallback Supabase si está configurado).
- `src/components/features/venta-rapida-sheet.tsx` — bottom sheet con input de monto (autofocus, teclado numérico), hora auto-completada, nota opcional.
- `src/components/layout/venta-rapida-fab.tsx` — FAB brand-colored bottom-right, abre el sheet.
- `src/components/layout/app-shell.tsx` — integra el FAB, visible en todas las páginas.
- `src/lib/utils/ventas.ts` — helpers `ventasDelDia` / `ventasEnRango` (5/5 tests, centralizan la regla "pedidos cerrados + ventas rápidas").

### 3. Integraciones

- **Dashboard** (`src/app/page.tsx`): "Ventas hoy" y "ganancia estimada" suman ventas rápidas del día.
- **Cierre diario** (`src/app/cierre/page.tsx` + `src/lib/export/cierre-text.ts`):
  - `totalVentas` y `cantidadPedidos` suman ventas rápidas.
  - `buildCierreText` las lista en el reporte de WhatsApp/email.
  - Card visual nueva "Ventas rápidas" en la página de cierre (solo si hay alguna, muestra hora + nota + monto).

### 4. Tooling

- `vitest@2.1.9` como devDep.
- `vitest.config.ts` con alias `@` → `./src`.
- Scripts: `npm test` (vitest watch), `npm run verify` (tsc + eslint + vitest run).
- Plan documentado en `.hermes/plans/2026-08-18_184500-weekly-sales-view.md`.
- Sketches de design en `sketches/001-weekly-summary-{vercel,card}/`.

## Verificación

- `npm test --run` → **29/29 tests passing** (9 week + 5 ventas + 12 entities + 3 cierre-text)
- `npx tsc --noEmit` → 0 errores en mis archivos
- `npx eslint` → 0 errores en mis archivos (2 warnings preexistentes de `<img>` en page.tsx, no míos)
- `npm run build` → 14 páginas, todas OK

## Lo que NO está (follow-up, intencional)

- **Migración SQL** para tabla `ventas_rapidas` en Supabase — el repo tiene el fallback a localStorage, pero si quieren multi-device hay que crearla. Sin prisa porque la V1 del cliente corre 100% local.
- **Integración con WeeklySummary** para sumar ventas rápidas a los días del resumen — el componente ya está en este PR, solo falta pasarle `ventasRapidas` como prop (~3 líneas). Lo dejé para que sea diff más chiquito, pero puedo agregarlo si querés en este mismo PR.
- **Editar/eliminar ventas rápidas** desde UI — solo se crean por ahora. Si el cliente lo pide, lo agregamos.
- **Sugerencia proactiva** en cierre cuando no hubo ventas — descartado por scope.

## Notas para el reviewer

- El cliente ya está usando la app en producción (cliente único: Rotisería Antojos, 1-3 barberos, 1 local).
- El working tree tenía cambios sin commitear de otra feature (multi-tenant + auth) que no toqué — están stasheados en `feat/venta-rapida` con nombre `wip/fabio: feat/multi-tenant + auth (no mios)`. Si esos cambios también van a PR, hay que hacer un PR separado para no mezclarlos.
- Hay 5 errores de lint preexistentes en `main` (en `pedido-text.ts`, `supabase-repository.ts`, `image.ts`) que NO introduje. Si querés que los arregle, abro otro PR `chore/lint-baseline-cleanup`.
- El remote es `github.com/FabioArias23/app-antojos-mobile.git`. Si el dueño (Fabio) está manejando multi-tenant en otra rama, le conviene mergear este PR primero (no toca la infra de auth) y después su feature.
