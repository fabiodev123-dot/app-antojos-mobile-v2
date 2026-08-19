/**
 * cn — classnames helper (patrón shadcn/ui)
 *
 * Combina clases condicionales con clsx y resuelve conflictos de Tailwind
 * con tailwind-merge (ej: "p-2" + "p-4" → "p-4").
 *
 * Usado en todo el proyecto para variantes de componentes.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
