# Decisiones arquitectónicas (ADRs)

> Cada decisión documentada tiene: **qué** se decidió, **por qué**, **qué tradeoffs** se consideraron, y **qué consecuencia** trae.

---

## ADR-001 · Next.js en vez de React Native

**Fecha:** 2026-08-07
**Estado:** Aceptado

**Contexto:**
El usuario pidió "una app para rotisería que conecte con WhatsApp". No quedó claro al principio si era app nativa o web.

**Decisión:** Construir una **web app responsive con Next.js 16**, no una app nativa con React Native.

**Por qué:**
1. El usuario primario (dueño + señora) administra desde el celular, pero también necesita ver datos en la computadora — una web responsive cubre ambos sin código duplicado.
2. El 95% del valor está en el panel de administración, no en una app para clientes.
3. Los clientes piden por **WhatsApp directamente** — no necesitan app propia.
4. React Native suma complejidad brutal (App Store, certificados, debugging nativo) sin valor agregado real para el caso.
5. Si en el futuro hace falta mobile nativo, se puede montar RN (Expo) ADELANTE del mismo backend, sin reescribir nada.

**Tradeoffs:**
- ❌ No hay ícono en el home del celular → mitiga con PWA (próximo paso).
- ❌ Necesita internet para abrir la app → los dueños tienen 4G en el local.

**Consecuencia:** Stack elegido Next.js + TypeScript + Tailwind + shadcn/ui.

---

## ADR-002 · localStorage en vez de Supabase para esta fase

**Fecha:** 2026-08-07
**Estado:** Aceptado (reversible)

**Contexto:**
El usuario pidió "primero podemos hacerlo con localstorage y mockear los datos".

**Decisión:** Construir la capa de datos sobre `localStorage` con un `Repository<T>` abstracto que permita swap a Supabase después sin tocar la UI.

**Por qué:**
1. Velocidad de iteración: localStorage es instantáneo, sin migraciones.
2. Costo cero — clave para esta fase.
3. La dueña puede probar la app en su celular sin necesidad de crear cuenta ni configurar backend.
4. Arquitectura con repositorio abstracto → cuando llegue Supabase, es **cambiar la implementación**, no la UI.

**Tradeoffs:**
- ❌ Datos viven en UN celular — si se rompe el teléfono, se pierden.
- ❌ No hay sync entre dispositivos del señor y la señora.
- ❌ Volumen limitado a ~5-10MB.
- ✅ No necesita login (la app es "single user").

**Consecuencia:** `src/lib/repositories/` con interface + impl `local-repository.ts` y `reactive-repository.ts`. Próxima fase: crear `supabase-repository.ts` y swap en el factory.

---

## ADR-003 · Sistema de colores por PRODUCTO (no por categoría)

**Fecha:** 2026-08-07
**Estado:** Aceptado

**Contexto:**
El usuario pidió que los platos se reconozcan por colores. Dijo: *"un sándwich de miga viene con muchos sabores — ejemplo: rojo = jamón y queso, verde = milanesa, lila = verdura"*.

**Decisión:** Cada **producto** tiene su propio `color` (enum `ColorPlato`). Las categorías NO tienen color (sólo un `colorDefault` opcional para sugerir).

**Por qué:**
El usuario dijo explícitamente *"cada sabor = su color"*. Si el color viviera en la categoría, todos los sandwiches de miga serían del mismo color — perdiendo la diferenciación visual que el dueño necesita para reconocer un plato en 200ms.

**Tradeoffs:**
- ❌ Hay que asignar el color manualmente a cada producto al crearlo.
- ✅ Máxima flexibilidad visual.
- ✅ Coincide con la lógica de negocio: cada SANDWICH DE MIGA ESPECÍFICO (jamón y queso vs milanesa vs verdura) es visualmente distinto.

**Consecuencia:** `ColorPlato` enum con 12 colores mapeados a clases Tailwind (`bg-red-500`, `ring-red-500/40`, etc.). Ver `docs/ui/color-system.md`.

---

## ADR-004 · shadcn/ui nueva versión (base-nova) en vez de Radix

**Fecha:** 2026-08-07
**Estado:** Aceptado por default

**Contexto:**
create-next-app + shadcn init generaron shadcn con `@base-ui/react` (style: `base-nova`), no Radix UI clásico.

**Decisión:** Quedarse con `base-nova`. No instalar la variante Radix.

**Por qué:**
1. Es la versión actual oficial de shadcn.
2. La API es muy similar a Radix (props, `render`).
3. No fight contra el framework — usar lo que viene configurado.

**Tradeoffs:**
- ❌ Cambio importante vs shadcn clásico: **`asChild` no existe**. Se usa `render={<Link />}>`.
- ✅ Menos dependencias.

**Consecuencia:** Se creó `src/components/ui/button-link.tsx` que wrappea Button + Link usando `render`. **NUNCA** usar `asChild` en este proyecto.

---

## ADR-005 · Repository pattern con `useSyncExternalStore`

**Fecha:** 2026-08-07
**Estado:** Aceptado

**Contexto:**
Necesitamos que múltiples componentes en pantalla reaccionen a cambios en localStorage (ej: crear un pedido desde `/pedidos/nuevo` y verlo aparecer en `/`).

**Decisión:** Implementar un bus de versiones con `useSyncExternalStore` de React 18+. Cada mutación del storage bumpea la versión → todos los hooks suscritos re-renderizan.

**Por qué:**
1. `useSyncExternalStore` es la API oficial de React para sincronizar con stores externos.
2. Más liviano que Zustand/Redux para este caso.
3. Sin context, sin providers — funciona en cualquier componente client.

**Tradeoffs:**
- ❌ Toda mutación tiene que pasar por `createReactiveLocalRepository` (no podés `localStorage.setItem` directo).
- ✅ Reactividad perfecta con cero re-renders innecesarios.

**Consecuencia:** `src/hooks/use-storage-version.ts` + `src/lib/repositories/reactive-repository.ts`. **Regla:** siempre usar `useRepositoryList()` o `useRepositoryGet()` en componentes — nunca `localStorage` directo.

---

## ADR-006 · Mobile-first con bottom-nav (los dueños usan celular)

**Fecha:** 2026-08-07
**Estado:** Aceptado

**Contexto:**
El usuario dijo: *"va a ser la rotisería Antojos, es un señor y una señora, que administran su aplicación desde su celular"*.

**Decisión:** Layout mobile-first con bottom navigation fija (estilo app nativa). 5 secciones principales: Inicio, Pedidos, Productos, Stock, Cierre.

**Por qué:**
1. El uso primario es en celular — la nav inferior está siempre a 1 tap del pulgar.
2. Familiar para cualquier usuario de smartphone (WhatsApp, Instagram).
3. No necesitan aprender UX nueva.

**Tradeoffs:**
- ❌ En desktop queda "raro" — la nav inferior está flotando en una pantalla grande.
- ✅ En el celular (que es donde se usa el 90%) es perfecto.

**Consecuencia:** `src/components/layout/bottom-nav.tsx`. La nav inferior tiene `pb-[env(safe-area-inset-bottom)]` para respetar el notch en iPhone.

---

## ADR-007 · IDs con crypto.randomUUID() en vez de Date.now()

**Fecha:** 2026-08-07
**Estado:** Aceptado

**Contexto:**
El linter de Next.js 16 (regla `react-hooks/purity`) prohíbe llamar a `Date.now()` durante el render.

**Decisión:** Usar `crypto.randomUUID()` (disponible en todos los browsers modernos y en Node 19+) para generar IDs.

**Por qué:**
1. Cumple la regla de pureza de React.
2. UUID es único por definición — mejor para evitar colisiones.
3. No requiere import externo.

**Consecuencia:** `newId(prefix)` helper en `src/lib/repositories/types.ts`.

---

## Próximas decisiones a tomar (TODO)

- [ ] **ADR-009:** Cuándo migrar de localStorage a Supabase (trigger: primer duplicado de pedido, primera pérdida de datos, primer pedido "raro").
- [ ] **ADR-010:** WhatsApp — parser de mensajes (regex vs LLM vs botones interactivos).
- [ ] **ADR-011:** Autenticación — el dueño va a querer compartir el acceso con la señora. ¿Multi-user con Supabase Auth?

---

## ADR-008 · Zod para validación + storage guard

**Fecha:** 2026-08-07
**Estado:** Aceptado

**Decisión:** Instalar `zod` para validación de formularios + storage guard.

**Por qué:**
1. La validación manual (if/else en cada form) es frágil y se rompe fácil cuando agregás un campo.
2. Zod permite definir el schema UNA vez y derivar tipos TypeScript — no hay drift entre validación y tipos.
3. `~15KB al bundle` es un costo aceptable para la robustez que da.
4. Storage guard (`readJsonSafe`) valida que el localStorage no esté corrupto antes de parsear — defensa contra crashes por datos rotos.

**NO instalado (decidido explícitamente):**
- **Drizzle ORM**: sin DB local, no aplica. Reservado para V2 (Postgres).
- **TanStack Query**: sin data fetching remoto. Reservado para V2.
- **TanStack Table**: las tablas son chicas y funcionan nativas. Reservado si crecen o piden features avanzadas (sorting, filtering, virtualización).

**Consecuencia:** 4 schemas en `src/lib/schemas/` (producto, ingrediente, cliente, gasto) + entities en `entities.ts` + storage guards. Forms usan doble-pass: schema "form" (strings) → schema "create" (con coercion a tipos).