# Arquitectura

> Decisiones técnicas, capas y por qué cada una.

---

## Diagrama de capas

```
┌─────────────────────────────────────────────────┐
│                  UI (RSC + Client)               │
│  src/app/**  ·  src/components/**  ·  tailwind  │
└──────────────────────┬──────────────────────────┘
                       │ usa
                       ▼
┌─────────────────────────────────────────────────┐
│              Hooks reactivos                      │
│  useRepositoryList  ·  useRepositoryGet  ·  etc │
└──────────────────────┬──────────────────────────┘
                       │ usa
                       ▼
┌─────────────────────────────────────────────────┐
│         Capa de datos (Repository pattern)       │
│  productosRepository · pedidosRepository · etc  │
│  interface Repository<T> ← un solo contrato    │
└──────────────────────┬──────────────────────────┘
                       │ impl
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌──────────────────────┐
│  localStorage    │      │  Supabase (futuro)   │
│  (V1, ahora)     │      │  Postgres + Realtime│
└──────────────────┘      └──────────────────────┘
```

---

## Stack y versiones

| Capa | Tecnología | Versión | Por qué |
|---|---|---|---|
| Framework | Next.js | 16.3.0 | App Router + Server Components. Turbopack default. |
| Lenguaje | TypeScript | 5.x | Tipos estrictos. |
| UI runtime | React | 19.2.8 | Canary, incluye Activity, ViewTransitions. |
| Estilos | Tailwind | v4 | oklch, sin config file, CSS-first. |
| Componentes | shadcn/ui | base-nova | Usa `@base-ui/react`, no Radix. |
| Iconos | lucide-react | latest | Tree-shakeable, coherente con shadcn. |
| Estado | localStorage | — | Sin backend en V1. |
| Reactividad | useSyncExternalStore | — | API oficial React 18+. |
| Toasts | sonner | latest | UI de shadcn. |

---

## Routing (Next.js 16 App Router)

```
src/app/
├── layout.tsx              ← Shell + metadata + viewport
├── page.tsx                ← Dashboard / home
├── pedidos/
│   ├── page.tsx            ← Lista de pedidos con tabs por estado
│   └── nuevo/page.tsx      ← Wizard de creación
├── productos/page.tsx      ← Carta agrupada por categoría
├── ingredientes/page.tsx   ← Stock con alertas
├── clientes/page.tsx       ← Lista de clientes
└── cierre/page.tsx         ← Cierre diario + envíos
```

> **Importante sobre Next.js 16:**
> - Async APIs (`cookies()`, `headers()`, `params`, `searchParams`) son `Promise<>`. Usar `await props.params`.
> - `middleware.ts` se renombró a `proxy.ts` (no usado todavía).
> - Turbopack es el bundler default.

---

## Repository pattern

### Interface

```ts
// src/lib/repositories/types.ts
interface Repository<T extends BaseEntity> {
  list(): T[];
  get(id: string): T | null;
  create(data: CreateInput<T>): T;
  update(id: string, data: UpdateInput<T>): T;
  delete(id: string): boolean;
  replaceAll(items: T[]): void;
}
```

### Implementaciones

| Clase | Storage | Uso |
|---|---|---|
| `createLocalRepository<T>` | localStorage plano | V1 |
| `createReactiveLocalRepository<T>` | localStorage + bus | V1 (la que se usa realmente) |
| `createSupabaseRepository<T>` | Postgres | V2 (TODO) |

### Cómo se consume

```tsx
"use client";
import { productosRepository } from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";

export function ProductosList() {
  const productos = useRepositoryList(productosRepository);
  // productos es reactivo: cambia cuando cualquier parte
  // de la app crea/edita/borra productos.
  return productos.map(p => <PlatoCard producto={p} key={p.id} />);
}
```

---

## Reactividad: cómo funciona

```
[componente crea pedido]
       │
       ▼
pedidosRepository.create(...)  ← bumpStorageVersion()
       │                              │
       ▼                              ▼
localStorage.setItem(...)    listeners.forEach(cb)
                                       │
                                       ▼
                                 useSyncExternalStore
                                       │
                                       ▼
                                 useRepositoryList()
                                 (re-render)
```

**Regla de oro:** toda mutación de datos DEBE pasar por un repository reactivo. Nunca hacer `localStorage.setItem` directo desde un componente.

---

## Storage layout

Todas las keys tienen prefijo `antojos:` (definido en `STORAGE_KEYS`).

| Key | Tipo | Schema |
|---|---|---|
| `antojos:categorias` | `Categoria[]` | ver `data-model.md` |
| `antojos:productos` | `Producto[]` | ver `data-model.md` |
| `antojos:ingredientes` | `Ingrediente[]` | ver `data-model.md` |
| `antojos:recetas` | `Receta[]` | ver `data-model.md` |
| `antojos:clientes` | `Cliente[]` | ver `data-model.md` |
| `antojos:pedidos` | `Pedido[]` | ver `data-model.md` |
| `antojos:movimientos_stock` | `MovimientoStock[]` | ver `data-model.md` |
| `antojos:gastos` | `Gasto[]` | ver `data-model.md` |
| `antojos:cierres` | `CierreDiario[]` | ver `data-model.md` |
| `antojos:counters` | `{ pedidoNumero: number }` | contador |
| `antojos:seeded_v1` | `boolean` | flag de "ya sembré datos" |

---

## SSR safety

Next.js 16 renderiza en servidor por default. localStorage NO existe ahí.

**Patrón:** todas las funciones que tocan storage tienen un guard:

```ts
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
```

Si no es browser → no-op silencioso (no rompe el build).

---

## Diseño responsive

- **Mobile-first** con breakpoints `sm` (640px), `md` (768px), `lg` (1024px).
- **Bottom nav fija** en todas las páginas.
- **Header pegado al top** con título + acciones.
- **Cards** con `rounded-lg` + padding generoso para dedos gordos.

---

## Próximas capas a agregar

| Capa | Cuándo |
|---|---|
| Validación con zod | Antes de cualquier input de usuario real (V1.1) |
| Capa de Supabase | Cuando haya que compartir datos entre dispositivos (V2) |
| WhatsApp Cloud API webhook | Cuando los pedidos empiecen a llegar por WSP (V2) |
| Generación de PDF/Excel | Para los envíos de cierre (V1.1) |
| Auth (Supabase Auth) | Cuando sean más de 1 usuario (V2) |
| Tests (Vitest) | Antes de empezar la migración a Supabase |