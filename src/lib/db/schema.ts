/**
 * Schema Drizzle para Antojos.
 *
 * Mapea 1:1 las entidades del frontend (`src/lib/types/index.ts`) a tablas
 * Postgres. Decisiones clave:
 *
 * - IDs: `text` (no `uuid`) para mantener compatibilidad con `crypto.randomUUID()`
 *   que ya usa el frontend. Cuando se migre el dueño, los IDs viejos matchean.
 *
 * - `PedidoItem`: tabla APARTE (relación 1:N con `pedidos`) en vez de embebido.
 *   Esto permite queries eficientes tipo "¿cuántas empanadas se vendieron hoy?"
 *   sin escanear JSON. El frontend adapta: en lugar de `pedido.items` hace
 *   `pedido.items = db.query.pedidoItems.where({ pedidoId })`.
 *
 * - `Receta`: tabla M:N entre `productos` e `ingredientes` con `cantidad`.
 *
 * - Enums de Postgres para los campos finitos (color, estado, canal, etc.).
 *   Mantienen integridad referencial y son más baratos que `text` con check.
 *
 * - Timestamps `timestamptz` para createdAt/updatedAt + fechas (`fecha` del
 *   pedido se mantiene como `date` para queries diarias).
 */
import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const colorPlatoEnum = pgEnum("color_plato", [
  "red",
  "green",
  "purple",
  "yellow",
  "orange",
  "amber",
  "pink",
  "blue",
  "beige",
  "gray",
  "teal",
  "rose",
]);

export const estadoPedidoEnum = pgEnum("estado_pedido", [
  "pendiente",
  "preparando",
  "listo",
  "entregado",
  "cancelado",
]);

export const canalPedidoEnum = pgEnum("canal_pedido", [
  "whatsapp",
  "presencial",
  "telefono",
]);

export const tipoEntregaEnum = pgEnum("tipo_entrega", ["retiro", "delivery"]);

export const unidadMedidaEnum = pgEnum("unidad_medida", [
  "kg",
  "g",
  "l",
  "ml",
  "unidad",
  "paquete",
]);

export const tipoMovimientoStockEnum = pgEnum("tipo_movimiento_stock", [
  "entrada",
  "salida",
  "ajuste",
  "merma",
  "venta",
]);

export const categoriaGastoEnum = pgEnum("categoria_gasto", [
  "insumos",
  "servicios",
  "sueldos",
  "alquiler",
  "servicios_publicos",
  "transporte",
  "marketing",
  "otros",
]);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLAS
// ─────────────────────────────────────────────────────────────────────────────

export const categorias = pgTable("categorias", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  emoji: text("emoji"),
  colorDefault: colorPlatoEnum("color_default").notNull(),
  activo: boolean("activo").notNull().default(true),
  ...timestamps,
});

export const productos = pgTable(
  "productos",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    categoriaId: text("categoria_id")
      .notNull()
      .references(() => categorias.id, { onDelete: "restrict" }),
    precio: numeric("precio", { precision: 10, scale: 2, mode: "number" }).notNull(),
    color: colorPlatoEnum("color").notNull(),
    emoji: text("emoji"),
    imagen: text("imagen"),
    stockActual: integer("stock_actual").notNull().default(0),
    stockMinimo: integer("stock_minimo").notNull().default(0),
    activo: boolean("activo").notNull().default(true),
    ...timestamps,
  },
  (t) => ({
    categoriaIdx: index("productos_categoria_idx").on(t.categoriaId),
    activoIdx: index("productos_activo_idx").on(t.activo),
  }),
);

export const ingredientes = pgTable("ingredientes", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  unidad: unidadMedidaEnum("unidad").notNull(),
stockActual: numeric("stock_actual", {
      precision: 10,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    stockMinimo: numeric("stock_minimo", {
      precision: 10,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    costoUnitario: numeric("costo_unitario", {
      precision: 10,
      scale: 2,
      mode: "number",
    }),
  activo: boolean("activo").notNull().default(true),
  ...timestamps,
});

// M:N producto-ingrediente con cantidad (la "receta" del producto).
export const recetas = pgTable(
  "recetas",
  {
    id: text("id").primaryKey(),
    productoId: text("producto_id")
      .notNull()
      .references(() => productos.id, { onDelete: "cascade" }),
    ingredienteId: text("ingrediente_id")
      .notNull()
      .references(() => ingredientes.id, { onDelete: "cascade" }),
    cantidad: numeric("cantidad", {
      precision: 10,
      scale: 3,
      mode: "number",
    }).notNull(),
    ...timestamps,
  },
  (t) => ({
    unqPorProductoEIngrediente: uniqueIndex("recetas_unq").on(
      t.productoId,
      t.ingredienteId,
    ),
    productoIdx: index("recetas_producto_idx").on(t.productoId),
    ingredienteIdx: index("recetas_ingrediente_idx").on(t.ingredienteId),
  }),
);

export const ventasRapidas = pgTable(
  "ventas_rapidas",
  {
    id: text("id").primaryKey(),
    fecha: date("fecha").notNull(),
    hora: text("hora").notNull(),
    monto: numeric("monto", { precision: 10, scale: 2, mode: "number" }).notNull(),
    nota: text("nota"),
    tenantId: text("tenant_id").notNull(),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("ventas_rapidas_tenant_idx").on(t.tenantId),
    fechaIdx: index("ventas_rapidas_fecha_idx").on(t.fecha),
  }),
);

export const clientes = pgTable("clientes", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  telefono: text("telefono").notNull(),
  direccion: text("direccion"),
  email: text("email"),
  notas: text("notas"),
  totalPedidos: integer("total_pedidos").notNull().default(0),
  ultimaCompra: date("ultima_compra"),
  ...timestamps,
});

export const pedidos = pgTable(
  "pedidos",
  {
    id: text("id").primaryKey(),
    numero: integer("numero").notNull(),
    clienteId: text("cliente_id").references(() => clientes.id, {
      onDelete: "set null",
    }),
    nombreCliente: text("nombre_cliente").notNull(),
    telefonoCliente: text("telefono_cliente"),
    direccionEntrega: text("direccion_entrega"),
    subtotal: numeric("subtotal", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    envio: numeric("envio", {
      precision: 10,
      scale: 2,
      mode: "number",
    }),
    total: numeric("total", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    estado: estadoPedidoEnum("estado").notNull().default("pendiente"),
    canal: canalPedidoEnum("canal").notNull(),
    tipoEntrega: tipoEntregaEnum("tipo_entrega").notNull(),
    observaciones: text("observaciones"),
    fecha: date("fecha").notNull(),
    hora: text("hora").notNull(),
    cerradoAt: timestamp("cerrado_at", { withTimezone: true }),
    entregadoAt: timestamp("entregado_at", { withTimezone: true }),
    tenantId: text("tenant_id"),
    ...timestamps,
  },
  (t) => ({
    fechaIdx: index("pedidos_fecha_idx").on(t.fecha),
    estadoIdx: index("pedidos_estado_idx").on(t.estado),
    clienteIdx: index("pedidos_cliente_idx").on(t.clienteId),
    numeroUnq: uniqueIndex("pedidos_numero_unq").on(t.numero),
    tenantIdx: index("pedidos_tenant_idx").on(t.tenantId),
  }),
);

export const pedidoItems = pgTable(
  "pedido_items",
  {
    id: text("id").primaryKey(),
    pedidoId: text("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    productoId: text("producto_id").references(() => productos.id, {
      onDelete: "set null",
    }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nombreProducto: text("nombre_producto").notNull(),
    colorProducto: colorPlatoEnum("color_producto").notNull(),
    cantidad: integer("cantidad").notNull(),
    precioUnitario: numeric("precio_unitario", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    subtotal: numeric("subtotal", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    imagenProducto: text("imagen_producto"),
    observaciones: text("observaciones"),
    ...timestamps,
  },
  (t) => ({
    pedidoIdx: index("pedido_items_pedido_idx").on(t.pedidoId),
    productoIdx: index("pedido_items_producto_idx").on(t.productoId),
    tenantIdx: index("pedido_items_tenant_idx").on(t.tenantId),
  }),
);

export const movimientosStock = pgTable(
  "movimientos_stock",
  {
    id: text("id").primaryKey(),
    ingredienteId: text("ingrediente_id")
      .notNull()
      .references(() => ingredientes.id, { onDelete: "restrict" }),
    tipo: tipoMovimientoStockEnum("tipo").notNull(),
    cantidad: numeric("cantidad", {
      precision: 10,
      scale: 3,
      mode: "number",
    }).notNull(),
    motivo: text("motivo"),
    pedidoId: text("pedido_id").references(() => pedidos.id, {
      onDelete: "set null",
    }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => ({
    ingredienteIdx: index("mov_stock_ingrediente_idx").on(t.ingredienteId),
    fechaIdx: index("mov_stock_fecha_idx").on(t.fecha),
  }),
);

export const gastos = pgTable(
  "gastos",
  {
    id: text("id").primaryKey(),
    fecha: date("fecha").notNull(),
    categoria: categoriaGastoEnum("categoria").notNull(),
    monto: numeric("monto", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    descripcion: text("descripcion").notNull(),
    ...timestamps,
  },
  (t) => ({
    fechaIdx: index("gastos_fecha_idx").on(t.fecha),
  }),
);

export const cierresDiarios = pgTable(
  "cierres_diarios",
  {
    id: text("id").primaryKey(),
    fecha: date("fecha").notNull(),
    totalVentas: numeric("total_ventas", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    cantidadPedidos: integer("cantidad_pedidos").notNull(),
    totalGastos: numeric("total_gastos", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    balance: numeric("balance", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    notas: text("notas"),
    enviadoEmail: boolean("enviado_email").notNull().default(false),
    enviadoWsp: boolean("enviado_wsp").notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    fechaUnq: uniqueIndex("cierres_fecha_unq").on(t.fecha),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS (Drizzle relations API)
// ─────────────────────────────────────────────────────────────────────────────

export const categoriasRelations = relations(categorias, ({ many }) => ({
  productos: many(productos),
}));

export const productosRelations = relations(productos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [productos.categoriaId],
    references: [categorias.id],
  }),
  recetas: many(recetas),
  pedidoItems: many(pedidoItems),
}));

export const ingredientesRelations = relations(ingredientes, ({ many }) => ({
  recetas: many(recetas),
  movimientos: many(movimientosStock),
}));

export const recetasRelations = relations(recetas, ({ one }) => ({
  producto: one(productos, {
    fields: [recetas.productoId],
    references: [productos.id],
  }),
  ingrediente: one(ingredientes, {
    fields: [recetas.ingredienteId],
    references: [ingredientes.id],
  }),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  pedidos: many(pedidos),
}));

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [pedidos.clienteId],
    references: [clientes.id],
  }),
  items: many(pedidoItems),
}));

export const pedidoItemsRelations = relations(pedidoItems, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [pedidoItems.pedidoId],
    references: [pedidos.id],
  }),
  producto: one(productos, {
    fields: [pedidoItems.productoId],
    references: [productos.id],
  }),
}));

export const movimientosStockRelations = relations(movimientosStock, ({ one }) => ({
  ingrediente: one(ingredientes, {
    fields: [movimientosStock.ingredienteId],
    references: [ingredientes.id],
  }),
  pedido: one(pedidos, {
    fields: [movimientosStock.pedidoId],
    references: [pedidos.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (re-exports para usar en el resto del código)
// ─────────────────────────────────────────────────────────────────────────────

export type CategoriaDb = typeof categorias.$inferSelect;
export type ProductoDb = typeof productos.$inferSelect;
export type IngredienteDb = typeof ingredientes.$inferSelect;
export type RecetaDb = typeof recetas.$inferSelect;
export type ClienteDb = typeof clientes.$inferSelect;
export type PedidoDb = typeof pedidos.$inferSelect;
export type PedidoItemDb = typeof pedidoItems.$inferSelect;
export type MovimientoStockDb = typeof movimientosStock.$inferSelect;
export type GastoDb = typeof gastos.$inferSelect;
export type CierreDiarioDb = typeof cierresDiarios.$inferSelect;
export type VentaRapidaDb = typeof ventasRapidas.$inferSelect;