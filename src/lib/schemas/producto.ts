import { z } from "zod";
import { COLOR_PLATO_VALUES } from "@/lib/types";

export const productoCreateSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  categoriaId: z.string().min(1, "Elegí una categoría"),
  precio: z.coerce
    .number("Precio inválido")
    .positive("Precio mayor a 0")
    .max(1_000_000, "Precio demasiado alto"),
  color: z.enum(COLOR_PLATO_VALUES, { message: "Color inválido" }),
  emoji: z
    .string()
    .max(8, "Emoji demasiado largo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  imagen: z
    .string()
    .trim()
    .max(500, "Path demasiado largo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  stockActual: z.coerce
    .number("Stock inválido")
    .min(0, "Stock no puede ser negativo")
    .max(100_000, "Stock demasiado alto"),
  stockMinimo: z.coerce
    .number("Mínimo inválido")
    .min(0, "Mínimo no puede ser negativo")
    .max(100_000, "Mínimo demasiado alto"),
  activo: z.boolean(),
});

export type ProductoCreateInput = z.infer<typeof productoCreateSchema>;

export const productoFormSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  descripcion: z.string(),
  categoriaId: z.string(),
  precio: z.string().trim().min(1, "Requerido"),
  color: z.enum(COLOR_PLATO_VALUES),
  emoji: z.string(),
  imagen: z.string(),
  stockActual: z.string().trim(),
  stockMinimo: z.string().trim(),
  activo: z.boolean(),
});

export type ProductoFormInput = z.infer<typeof productoFormSchema>;