# Antojos — Rotisería

App de gestión mobile-first para la **Rotisería Antojos**. Reemplaza la libreta y el lápiz: el dueño y la señora la operan desde el celular.

Pensada para velocidad: la captura de pedidos desde WhatsApp es 1 paste → 1 tap. El cierre diario genera balance automático.

## Features

### V1 (prototipo actual)
- 🥪 **Catálogo** de 32 productos agrupados en 8 categorías (alitos, hambur pizza, empanadas, tortas/sándwiches, hamburguesas, pizzas, combos, helados)
- 🎨 **Color por sabor** — cada producto tiene su color identificatorio (visual recognition, no necesitan leer)
- 🧾 **Pedidos** con estados (`pendiente` → `preparando` → `listo` → `entregado`)
- 📦 **Stock** de productos pre-hechos con alertas automáticas cuando baja del mínimo
- 🌙 **Cierre diario** con balance automático (ventas − gastos)
- 📊 **Dashboard** con resumen del día, pedidos activos y alertas
- 💸 **Gastos** categorizados
- 🤖 **Parser de WhatsApp** — pegás el mensaje del cliente y detecta productos + nombre del cliente automáticamente
- ⚡ **Pedido Rápido** — modo sin cliente para ventas de mostrador
- 📱 **Mobile-first** con bottom nav, cards collapsibles por categoría y sticky bar de confirmación

### Próximas (V2)
- [ ] Migración a Supabase (reemplaza localStorage, mismo Repository interface)
- [ ] Integración WhatsApp Business API (parseo automático desde mensajes reales)
- [ ] Generación PDF/Excel del cierre
- [ ] Multi-local + roles (admin / empleado)

## Stack

| Capa | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| UI | React 19 + shadcn/ui (base-nova) |
| Estilos | Tailwind CSS v4 + tema dark custom |
| Datos | localStorage (V1) — Repository pattern listo para Supabase |
| Validación | Zod 4 (schemas de form + create) |
| Persistencia | Repository reactivo con `useSyncExternalStore` |

## Cómo arrancar

### Requisitos
- Node.js 20+
- npm 10+

### Setup

```bash
# 1. Clonar el repo
git clone https://github.com/FabioArias23/app-antojos-mobile.git
cd app-antojos-mobile

# 2. Instalar dependencias
npm install

# 3. (Opcional) copiar .env.example si vas a conectar Supabase
cp .env.example .env

# 4. Levantar dev server
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador. La app carga con datos mock (32 productos, categorías, etc.).

### Crear el primer super admin (panel `/admin`)

El middleware protege `/admin/*` y `loginAction` exige que el user esté en `public.super_admins`. **No hay admin pre-creado** — lo creás vos una sola vez con `service_role`:

```bash
# 1. Asegurate de tener en .env.local:
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=... (o PUBLISHABLE_KEY)
#    SUPABASE_SERVICE_ROLE_KEY=...   # ⚠️ NUNCA exponer al cliente

# 2. Corré las migrations si todavía no lo hiciste
npm run db:push   # o el flujo Drizzle que uses

# 3. Creá el primer admin (idempotente)
npm run admin:create -- admin@antojos.com "TuPassword123!"
```

El script (`scripts/create-admin.ts`) usa `supabase.auth.admin.createUser()` + `INSERT INTO super_admins`. Es seguro correrlo varias veces: si el email ya existe, solo asegura la membresía. Si ya es super admin, no hace nada.

Después andá a [http://localhost:3000/login](http://localhost:3000/login) (no `/admin/login` — el middleware redirige ahí si no hay sesión).

### Build de producción

```bash
npm run build
npm run start
```

## Flujos de uso principales

### Capturar pedido desde WhatsApp
1. Tap en el botón **+** del bottom-nav → "Pegar pedido de WhatsApp"
2. Pegar el mensaje del cliente (ej: *"Hola María, 2 sanguches de milanesa y una coca"*)
3. Tap **Parsear** → preview muestra cliente detectado, items y total
4. Tap **Crear pedido para María** → guarda y vuelve al listado

### Pedido rápido de mostrador
1. Tap en **+** → "Pedido Rápido"
2. Seleccionar productos con **+** en cada card
3. Tap **Confirmar pedido** (gradient naranja)

### Cerrar el día
1. Ir a **Cierre** (bottom-nav)
2. Verificar balance (ventas − gastos)
3. Tap **Guardar cierre del día** → se persiste con timestamp

## Estructura del proyecto

```
app-antojos-mobile/
├── src/
│   ├── app/                        ← Next.js App Router
│   │   ├── page.tsx                ← Dashboard / Resumen del día
│   │   ├── pedidos/                ← Lista + nuevo pedido (parser WSP)
│   │   ├── productos/              ← Carta completa
│   │   ├── ingredientes/           ← Stock (tabs: materia prima / platos)
│   │   ├── clientes/               ← Lista de clientes
│   │   └── cierre/                 ← Cierre diario + exportes
│   ├── components/
│   │   ├── ui/                     ← shadcn/ui (button, card, sheet, tabs, etc.)
│   │   ├── layout/                 ← AppShell, ShellHeader, BottomNav
│   │   └── features/               ← PlatoCard, ColorStripe, PedidoParser, etc.
│   ├── hooks/
│   │   ├── use-repository.ts        ← Hook reactivo con useSyncExternalStore
│   │   └── use-storage-version.ts   ← Bus reactivo del storage
│   ├── lib/
│   │   ├── types/                  ← Modelos de datos (Producto, Pedido, etc.)
│   │   ├── storage/                ← localStorage + seed
│   │   ├── repositories/           ← Capa de datos (Repository pattern)
│   │   ├── services/                ← Lógica de dominio (pedido-service, stock)
│   │   ├── parse/                   ← Parser WSP (regex + fuzzy matching)
│   │   ├── export/                  ← Generación PDF/Excel del cierre
│   │   └── mock/                    ← Datos seed (32 productos, 8 categorías)
│   └── styles/
├── public/
│   └── imgplatos/                  ← Imágenes de productos (1.jpg - 28.jpg)
├── .memory/                         ← Contexto del proyecto (decisiones, glosario)
├── docs/                            ← Documentación técnica
├── package.json
└── tsconfig.json
```

## Decisiones arquitectónicas clave

- **Repository pattern**: la capa `lib/repositories/` abstrae el storage. Migrar a Supabase es cambiar la implementación sin tocar componentes.
- **`useSyncExternalStore`**: hook reactivo para storage local que evita re-renders innecesarios (mismo patrón que usa Zustand/Redux internamente).
- **Color por producto, no por categoría**: cada producto define su propio color (ver `docs/ui/color-system.md`). El dueño reconoce un plato de reojo por el color de la barra lateral.
- **Parser fuzzy**: matching por intersección de tokens con score recall-biased. Matchea "sanguches de milanesa" → "Miga de Milanesa" aunque el usuario omita la palabra de categoría.

## Datos mock y reset

La primera vez que abrís la app se siembran 32 productos + 8 categorías + clientes + pedidos de ejemplo. Si querés resetear:

```js
// En DevTools → Console:
Object.keys(localStorage)
  .filter(k => k.startsWith('antojos:'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

La próxima vez que cargue la app, se vuelven a sembrar (bumped a `seeded_v7`).

Para forzar re-seed con cambios nuevos, bumpeá `STORAGE_KEYS.seeded` en `src/lib/storage/local-storage.ts` (ej: `seeded_v8`) y refresheá.

## Workflow de Git

```bash
# Branch feature
git checkout -b feat/nueva-feature

# Commits descriptivos (conventional commits)
git add .
git commit -m "feat(parser): sinónimos coloquiales para categorías"

# Push
git push -u origin feat/nueva-feature

# Después merge a main
git checkout main
git merge feat/nueva-feature
git push origin main
```

## Documentación

| Archivo | Qué hay |
|---|---|
| [`.memory/README.md`](.memory/README.md) | Contexto general del proyecto |
| [`.memory/decisions.md`](.memory/decisions.md) | ADRs (decisiones arquitectónicas) |
| [`.memory/glossary.md`](.memory/glossary.md) | Términos del dominio rotisería |
| [`docs/brainstorm.md`](docs/brainstorm.md) | Brainstorming inicial |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura técnica |
| [`docs/data-model.md`](docs/data-model.md) | Modelo de datos |
| [`docs/ui/color-system.md`](docs/ui/color-system.md) | Sistema de colores por producto |

## Licencia

MIT — hacer lo que quieras.
