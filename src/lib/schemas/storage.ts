import { z } from "zod";
import {
  categoriaSchema,
  cierreDiarioSchema,
  clienteSchema,
  gastoSchema,
  ingredienteSchema,
  movimientoStockSchema,
  pedidoItemSchema,
  pedidoSchema,
  productoSchema,
  recetaSchema,
} from "./entities";

export const categoriasArraySchema = z.array(categoriaSchema);
export const productosArraySchema = z.array(productoSchema);
export const ingredientesArraySchema = z.array(ingredienteSchema);
export const recetasArraySchema = z.array(recetaSchema);
export const clientesArraySchema = z.array(clienteSchema);
export const pedidosArraySchema = z.array(pedidoSchema);
export const pedidoItemsArraySchema = z.array(pedidoItemSchema);
export const movimientosStockArraySchema = z.array(movimientoStockSchema);
export const gastosArraySchema = z.array(gastoSchema);
export const cierresArraySchema = z.array(cierreDiarioSchema);

export const countersSchema = z.object({
  pedidoNumero: z.number().int().nonnegative(),
});

export const seededFlagSchema = z.boolean();