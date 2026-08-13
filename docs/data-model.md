# Modelo de datos

> Las 9 entidades del dominio. Una sola fuente de verdad: `src/lib/types/index.ts`.

---

## Diagrama ER (resumido)

```
   ┌─────────────┐
   │ CATEGORIA   │ 1
   │             │
   └──────┬──────┘
          │ N
          ▼
   ┌─────────────┐         ┌─────────────┐
   │  PRODUCTO   │ M─────M │ INGREDIENTE │
   │  (color)    │ RECETA  │  (stock)    │
   └──────┬──────┘         └──────┬──────┘
          │                       │
          │ N                     │ 1
          ▼                       ▼
   ┌─────────────┐         ┌─────────────────┐
   │  PEDIDO     │         │ MOVIMIENTO STOCK│
   │  (items)    │         │ (entrada/salida)│
   └──────┬──────┘         └─────────────────┘
          │ N
          │
          ▼ 0..1
   ┌─────────────┐
   │  CLIENTE    │
   └─────────────┘

   ┌─────────────┐
   │   GASTO     │  (independiente)
   └─────────────┘

   ┌─────────────┐
   │ CIERRE      │  (agregado diario)
   └─────────────┘
```

---

## Entidades

### Categoria
Agrupa productos. Tiene `colorDefault` para sugerir, pero cada producto tiene su propio color.

```ts
interface Categoria extends BaseEntity {
  nombre: string;
  emoji?: string;
  colorDefault: ColorPlato;
  activo: boolean;
}
```

### Producto
La unidad vendible. Tiene `color` propio (clave para reconocimiento visual).

```ts
interface Producto extends BaseEntity {
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  precio: number;          // en centavos de peso? NO — en pesos enteros con .toLocaleString()
  color: ColorPlato;       // ← EL DIFERENCIADOR VISUAL
  emoji?: string;
  activo: boolean;
}
```

> **Decisión de dinero:** los precios se guardan como `number` (pesos, no centavos). Para una rotisería argentina es suficiente precisión. Si el sistema crece y se necesita facturar, cambiar a centavos.

### Ingrediente
Insumo con stock. Tiene mínimo para alertas.

```ts
interface Ingrediente extends BaseEntity {
  nombre: string;
  unidad: UnidadMedida;
  stockActual: number;
  stockMinimo: number;
  costoUnitario?: number;  // para calcular costo del plato en el futuro
  activo: boolean;
}
```

### Receta
Relación M:N entre Producto e Ingrediente con cantidad.

```ts
interface Receta extends BaseEntity {
  productoId: string;
  ingredienteId: string;
  cantidad: number;        // en la unidad del Ingrediente
}
```

> **Futuro:** cuando un pedido se marca como `entregado`, el sistema debería generar automáticamente `MovimientoStock{tipo: 'venta'}` para cada ingrediente de la receta.

### Cliente

```ts
interface Cliente extends BaseEntity {
  nombre: string;
  telefono: string;        // formato libre, idealmente +54 11 5555-1234
  direccion?: string;
  email?: string;
  notas?: string;
  totalPedidos: number;    // contador desnormalizado (más rápido que contar)
  ultimaCompra?: string;   // ISO
}
```

### Pedido
Núcleo de la app. Incluye items inline (no hay tabla separada en localStorage).

```ts
interface Pedido extends BaseEntity {
  numero: number;          // número visible (1, 2, 3...) — viene de `counters`
  clienteId?: string;      // opcional: puede ser cliente "mostrador" sin registro
  nombreCliente: string;   // snapshot por si se borra el cliente
  telefonoCliente?: string;
  direccionEntrega?: string;
  items: PedidoItem[];     // inline
  subtotal: number;
  total: number;
  estado: EstadoPedido;
  canal: CanalPedido;
  tipoEntrega: TipoEntrega;
  observaciones?: string;
  fecha: string;           // YYYY-MM-DD
  hora: string;            // HH:MM
  cerradoAt?: string;
  entregadoAt?: string;
}

interface PedidoItem extends BaseEntity {
  pedidoId: string;
  productoId: string;
  nombreProducto: string;  // snapshot del nombre
  colorProducto: ColorPlato; // snapshot del color (importante si después cambia el producto)
  cantidad: number;
  precioUnitario: number;  // snapshot del precio
  subtotal: number;
  observaciones?: string;
}
```

> **Decisión: snapshot en items.** Cuando se crea un pedido, los items guardan nombre + color + precio del momento. Si después cambia el producto (ej: sube el precio), los pedidos viejos no se ven afectados. Esto es fundamental para la integridad histórica.

### MovimientoStock

```ts
interface MovimientoStock extends BaseEntity {
  ingredienteId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;        // siempre positivo, el `tipo` define si suma o resta
  motivo?: string;
  pedidoId?: string;       // si fue generado por un pedido
  fecha: string;
}
```

### Gasto

```ts
interface Gasto extends BaseEntity {
  fecha: string;           // YYYY-MM-DD
  categoria: CategoriaGasto;
  monto: number;
  descripcion: string;
}
```

### CierreDiario

```ts
interface CierreDiario extends BaseEntity {
  fecha: string;           // YYYY-MM-DD, único
  totalVentas: number;
  cantidadPedidos: number;
  totalGastos: number;
  balance: number;         // totalVentas - totalGastos
  notas?: string;
  enviadoEmail: boolean;
  enviadoWsp: boolean;
}
```

---

## Enums

```ts
type ColorPlato =
  | "red" | "green" | "purple" | "yellow" | "orange"
  | "amber" | "pink" | "blue" | "beige" | "gray"
  | "teal" | "rose";

type EstadoPedido =
  | "pendiente" | "preparando" | "listo" | "entregado" | "cancelado";

type CanalPedido = "whatsapp" | "presencial" | "telefono";

type TipoEntrega = "retiro" | "delivery";

type UnidadMedida = "kg" | "g" | "l" | "ml" | "unidad" | "paquete";

type TipoMovimientoStock =
  | "entrada" | "salida" | "ajuste" | "merma" | "venta";

type CategoriaGasto =
  | "insumos" | "servicios" | "sueldos" | "alquiler"
  | "servicios_publicos" | "transporte" | "marketing" | "otros";
```

---

## BaseEntity (todas heredan)

```ts
interface BaseEntity {
  id: string;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
}
```

---

## Reglas de integridad

| Regla | Cómo se enforce |
|---|---|
| Stock no puede ser negativo | En el setter de stockActual (validación). Hoy NO enforced — TODO. |
| `stockActual <= stockMinimo` ⇒ alerta | En el render del componente, no en la data. |
| `CierreDiario.fecha` único | Convención (no enforced). El seed asume 1 cierre por día. |
| `Pedido.numero` único y creciente | `counters.pedidoNumero` (atómico en single-user). |
| Items tienen snapshot de producto | Se llena al crear el pedido. |

---

## Migración a Postgres (V2)

Cuando se decida migrar a Supabase, el equivalente SQL aproximado:

```sql
create table categorias (
  id text primary key,
  nombre text not null,
  emoji text,
  color_default text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table productos (
  id text primary key,
  nombre text not null,
  descripcion text,
  categoria_id text references categorias(id) on delete restrict,
  precio numeric(10,2) not null,
  color text not null,
  emoji text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ... etc

create table pedidos (
  id text primary key,
  numero int not null unique,
  cliente_id text references clientes(id),
  nombre_cliente text not null,
  -- ... snapshot fields
  estado text not null check (estado in ('pendiente','preparando','listo','entregado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pedido_items (
  id text primary key,
  pedido_id text not null references pedidos(id) on delete cascade,
  -- ... snapshot fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pedido_items enable row level security;
alter table pedidos enable row level security;
-- policies para que el dueño lea/escriba todo.
```

> **No se implementa todavía.** Es referencia mental para cuando llegue el momento.