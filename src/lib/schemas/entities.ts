import { z } from "zod";
import { COLOR_PLATO_VALUES } from "@/lib/types";

export const colorPlatoSchema = z.enum(COLOR_PLATO_VALUES);

export const baseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const categoriaSchema = baseEntitySchema.extend({
  nombre: z.string(),
  emoji: z.string().optional(),
  colorDefault: colorPlatoSchema,
  activo: z.boolean(),
});

export const productoSchema = baseEntitySchema.extend({
  nombre: z.string(),
  descripcion: z.string().optional(),
  categoriaId: z.string(),
  precio: z.number().nonnegative(),
  color: colorPlatoSchema,
  emoji: z.string().optional(),
  imagen: z.string().optional(),
  stockActual: z.number().nonnegative(),
  stockMinimo: z.number().nonnegative(),
  activo: z.boolean(),
});

export const unidadMedidaSchema = z.enum(["kg", "g", "l", "ml", "unidad", "paquete"]);

export const ingredienteSchema = baseEntitySchema.extend({
  nombre: z.string(),
  unidad: unidadMedidaSchema,
  stockActual: z.number(),
  stockMinimo: z.number(),
  costoUnitario: z.number().optional(),
  activo: z.boolean(),
});

export const recetaSchema = baseEntitySchema.extend({
  productoId: z.string(),
  ingredienteId: z.string(),
  cantidad: z.number().positive(),
});

export const clienteSchema = baseEntitySchema.extend({
  nombre: z.string(),
  telefono: z.string(),
  direccion: z.string().optional(),
  email: z.string().optional(),
  notas: z.string().optional(),
  totalPedidos: z.number().nonnegative(),
  ultimaCompra: z.string().optional(),
});

export const estadoPedidoSchema = z.enum([
  "pendiente",
  "preparando",
  "listo",
  "entregado",
  "cancelado",
]);

export const canalPedidoSchema = z.enum(["whatsapp", "presencial", "telefono"]);
export const tipoEntregaSchema = z.enum(["retiro", "delivery"]);

export const pedidoItemSchema = baseEntitySchema.extend({
  pedidoId: z.string(),
  productoId: z.string(),
  nombreProducto: z.string(),
  colorProducto: colorPlatoSchema,
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  imagenProducto: z.string().optional(),
  observaciones: z.string().optional(),
});

export const pedidoSchema = baseEntitySchema.extend({
  numero: z.number().int().positive(),
  clienteId: z.string().optional(),
  nombreCliente: z.string(),
  telefonoCliente: z.string().optional(),
  direccionEntrega: z.string().optional(),
  items: z.array(pedidoItemSchema),
  subtotal: z.number().nonnegative(),
  envio: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  estado: estadoPedidoSchema,
  canal: canalPedidoSchema,
  tipoEntrega: tipoEntregaSchema,
  observaciones: z.string().optional(),
  fecha: z.string(),
  hora: z.string(),
  cerradoAt: z.string().optional(),
  entregadoAt: z.string().optional(),
});

export const tipoMovimientoStockSchema = z.enum([
  "entrada",
  "salida",
  "ajuste",
  "merma",
  "venta",
]);

export const movimientoStockSchema = baseEntitySchema.extend({
  ingredienteId: z.string(),
  tipo: tipoMovimientoStockSchema,
  cantidad: z.number().positive(),
  motivo: z.string().optional(),
  pedidoId: z.string().optional(),
  fecha: z.string(),
});

export const categoriaGastoSchema = z.enum([
  "insumos",
  "servicios",
  "sueldos",
  "alquiler",
  "servicios_publicos",
  "transporte",
  "marketing",
  "otros",
]);

export const gastoSchema = baseEntitySchema.extend({
  fecha: z.string(),
  categoria: categoriaGastoSchema,
  monto: z.number().positive(),
  descripcion: z.string(),
});

export const cierreDiarioSchema = baseEntitySchema.extend({
  fecha: z.string(),
  totalVentas: z.number().nonnegative(),
  cantidadPedidos: z.number().nonnegative(),
  totalGastos: z.number().nonnegative(),
  balance: z.number(),
  notas: z.string().optional(),
  enviadoEmail: z.boolean(),
  enviadoWsp: z.boolean(),
});

/**
 * Schema para input de form (antes de completar con fecha/hora/id).
 * Acepta string en `monto` porque el input devuelve texto, lo convertimos
 * a number en el schema de create.
 */
export const ventaRapidaFormSchema = z.object({
  monto: z
    .string()
    .min(1, "Ingresá un monto")
    .refine((s) => /^\d+$/.test(s.trim()), "Solo números enteros")
    .refine((s) => Number(s) > 0, "El monto tiene que ser mayor a 0")
    .refine((s) => Number(s) <= 9_999_999, "Monto demasiado grande"),
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)"),
  nota: z.string().max(120, "Nota demasiado larga (máx 120)").optional(),
});

/**
 * Schema para el create final (lo que se persiste en el repo).
 * Convierte `monto` de string a number.
 */
export const ventaRapidaCreateSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  monto: z.number().int().positive(),
  nota: z.string().max(120).optional(),
});