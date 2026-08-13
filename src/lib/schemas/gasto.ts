import { z } from "zod";

const CATEGORIAS = [
  "insumos",
  "servicios",
  "sueldos",
  "alquiler",
  "servicios_publicos",
  "transporte",
  "marketing",
  "otros",
] as const;

export const gastoCreateSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  categoria: z.enum(CATEGORIAS),
  monto: z.coerce
    .number("Monto inválido")
    .positive("Monto mayor a 0")
    .max(10_000_000, "Monto demasiado alto"),
  descripcion: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(200, "Máximo 200 caracteres"),
});

export type GastoCreateInput = z.infer<typeof gastoCreateSchema>;

export const gastoFormSchema = z.object({
  descripcion: z.string().trim().min(1, "Requerido"),
  categoria: z.enum(CATEGORIAS),
  monto: z.string().trim().min(1, "Requerido"),
});

export type GastoFormInput = z.infer<typeof gastoFormSchema>;