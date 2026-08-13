import { z } from "zod";

const phoneRegex = /^[\d\s+()-]{6,30}$/;

export const clienteCreateSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  telefono: z
    .string()
    .trim()
    .min(6, "Mínimo 6 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(phoneRegex, "Formato de teléfono inválido"),
  direccion: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notas: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  totalPedidos: z.number().nonnegative().default(0),
  ultimaCompra: z.string().optional(),
});

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;

export const clienteFormSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  telefono: z.string().trim().min(1, "Requerido"),
  direccion: z.string(),
  email: z.string(),
  notas: z.string(),
});

export type ClienteFormInput = z.infer<typeof clienteFormSchema>;