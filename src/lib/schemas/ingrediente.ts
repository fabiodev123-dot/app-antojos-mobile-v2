import { z } from "zod";

const UNIDADES = ["kg", "g", "l", "ml", "unidad", "paquete"] as const;

export const ingredienteCreateSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  unidad: z.enum(UNIDADES),
  stockActual: z.coerce
    .number("Stock inválido")
    .nonnegative("El stock no puede ser negativo")
    .max(1_000_000, "Stock demasiado alto"),
  stockMinimo: z.coerce
    .number("Mínimo inválido")
    .nonnegative("El mínimo no puede ser negativo")
    .max(1_000_000, "Mínimo demasiado alto"),
  costoUnitario: z.coerce
    .number()
    .nonnegative("El costo no puede ser negativo")
    .optional(),
  activo: z.boolean(),
});

export type IngredienteCreateInput = z.infer<typeof ingredienteCreateSchema>;

export const ingredienteFormSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  unidad: z.enum(UNIDADES),
  stockActual: z.string().trim().min(1, "Requerido"),
  stockMinimo: z.string().trim().min(1, "Requerido"),
  costoUnitario: z.string(),
  activo: z.boolean(),
});

export type IngredienteFormInput = z.infer<typeof ingredienteFormSchema>;