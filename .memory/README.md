# Antojos — Memoria del proyecto

> **¿Qué es esto?** El "cerebro" del proyecto. Acá vive TODO el contexto que un agente (humano o IA) necesita para entender Antojos sin haber estado en la conversación original.

---

## TL;DR

App de gestión para **Antojos**, una rotisería familiar. Reemplaza la libreta y el lápiz. Corre en el celular del dueño/a (el señor y la señora que administran el local). Built with Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui. Datos en `localStorage` por ahora; arquitectura preparada para migrar a Supabase cuando sea necesario.

---

## El negocio

- **Nombre:** Antojos (rotisería)
- **Dueños:** un señor y una señora (no hay empleados adicionales por ahora)
- **Dispositivo principal:** celular propio (no PC, no tablet dedicado)
- **Canal de pedidos:** WhatsApp Business (ya existente, dedicado)
- **Local:** único, físico
- **Servicios:** retiro en local + delivery
- **Sistema anterior:** lápiz y papel (lo que estamos reemplazando)
- **Volumen estimado:** ~50 productos, ~10-30 pedidos/día
- **Lo que nos pagan / presupuesto:** free tiers por ahora (Vercel, Supabase free, Meta Cloud API free)

---

## Lo que hace la app (resumen funcional)

1. **Catálogo de productos** reconocibles por **COLOR** — cada sabor/variante tiene su color identificatorio (sandwiches de miga, milanesas, pizzas, empanadas, tartas, ensaladas, platos del día, bebidas, postres).
2. **Pedidos** con estados (pendiente → preparando → listo → entregado) y origen (WhatsApp / presencial / teléfono).
3. **Stock de ingredientes** con alertas automáticas cuando `stockActual ≤ stockMinimo`.
4. **Recetas** (qué ingredientes componen cada producto) — habilita descuento automático de stock cuando se entrega un pedido.
5. **Clientes** con historial (teléfono, dirección, total de pedidos, última compra, notas).
6. **Gastos diarios** categorizados (insumos, servicios, sueldos, etc.).
7. **Cierre diario** con balance ventas - gastos, exportable a PDF/Excel/email/WhatsApp.

## Lo que NO hace todavía (futuro)

- Integración real con WhatsApp Business API (hoy los pedidos se cargan manualmente desde el panel).
- Multi-local.
- Sistema de delivery con tracking.
- Facturación AFIP.
- Roles (admin vs empleado) — por ahora son solo los dueños.

---

## Mapa de archivos importantes

```
src/
  app/                    ← App Router (Next 16)
    page.tsx              ← Dashboard / home
    pedidos/              ← Lista + nuevo pedido
    productos/            ← Carta completa agrupada por categoría
    ingredientes/         ← Stock con alertas
    clientes/             ← Lista de clientes
    cierre/               ← Cierre diario + envíos
  components/
    ui/                   ← shadcn/ui (button, card, badge, etc.)
    layout/               ← AppShell, BottomNav, ShellHeader
    features/             ← PlatoCard, ColorStripe, ColorDot, ColorBadge
  hooks/
    use-repository.ts     ← Hook reactivo que se sincroniza con localStorage
    use-storage-version.ts← Bus reactivo que escucha cambios
  lib/
    types/index.ts        ← Todas las interfaces del dominio
    storage/
      local-storage.ts    ← Wrapper SSR-safe
      seed.ts             ← Carga mock data en primer mount
    repositories/
      types.ts            ← Interface Repository<T>
      local-repository.ts ← Impl base sobre localStorage
      reactive-repository.ts ← Wrapper que emite cambios
      index.ts            ← Instancias singleton
      counters.ts         ← Numerador de pedidos
    mock/                 ← Datos de ejemplo (50 productos, 8 categorías, etc.)
    format.ts             ← Helpers de moneda, fecha, hora
.memory/                  ← ESTE directorio (decisiones, glosario)
docs/                     ← Documentación técnica
```

---

## Cómo arrancar

```bash
npm install
npm run dev
```

Para resetear datos mock: en DevTools → Application → Local Storage → borrar keys con prefijo `antojos:`.

---

## Convenciones del proyecto

- **Named exports** por default
- **Componentes**: si usan hooks o eventos → `"use client"` arriba
- **Colores**: cada producto define su propio color (`ColorPlato` enum). Las categorías sólo sugieren un default.
- **Repos**: nunca tocar localStorage directamente desde componentes — siempre ir por `productosRepository.create(...)`, etc.
- **IDs**: prefijo por entidad (`prod_`, `cli_`, `ped_`, `ing_`, etc.)
- **Comentarios**: NUNCA en el código. La documentación vive en `.memory/` y `docs/`.

---

## Stack

| Capa | Tech | Versión |
|---|---|---|
| Framework | Next.js | 16.3.0 (App Router, Turbopack) |
| Lenguaje | TypeScript | 5.x |
| UI | React | 19.2.8 |
| Estilos | Tailwind CSS | v4 |
| Componentes | shadcn/ui | base-nova (usa `@base-ui/react`) |
| Iconos | lucide-react | latest |
| Estado | localStorage + `useSyncExternalStore` | — |
| Validación | (próximamente zod) | — |

---

## Referencias

- `.memory/decisions.md` — por qué se tomó cada decisión arquitectónica
- `.memory/glossary.md` — términos del dominio rotisería
- `docs/brainstorm.md` — la sesión de brainstorming inicial completa
- `docs/architecture.md` — diagrama y decisiones técnicas
- `docs/data-model.md` — modelo de datos detallado
- `docs/ui/color-system.md` — cómo se usan los colores