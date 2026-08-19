import type { Pedido, VentaRapida } from "@/lib/types";

/**
 * Helpers de cálculo de ventas.
 *
 * Centralizan la lógica "qué cuenta como venta en el día X" para que
 * dashboard, cierre diario y resumen semanal no dupliquen reglas.
 *
 * Reglas:
 * - Un Pedido cuenta si `estado === "entregado" || "listo"` (cerrado y cobrado).
 *   `pendiente`, `preparando` y `cancelado` NO cuentan.
 * - Una VentaRapida SIEMPRE cuenta (se persiste como ya cobrada).
 * - Ambas entidades matchean por `fecha === fechaObjetivo` (ISO YYYY-MM-DD).
 */

/** Estados de pedido que efectivamente generaron plata. */
const ESTADOS_QUE_CUENTAN: ReadonlySet<Pedido["estado"]> = new Set([
  "entregado",
  "listo",
]);

/**
 * Suma de ventas (pedidos cerrados + ventas rápidas) de un día específico.
 *
 * @example
 * ventasDelDia(pedidos, ventasRapidas, "2026-08-18") // → 12500
 */
export function ventasDelDia(
  pedidos: ReadonlyArray<Pedido>,
  ventasRapidas: ReadonlyArray<VentaRapida>,
  fechaObjetivo: string,
): number {
  let total = 0;
  for (const p of pedidos) {
    if (p.fecha === fechaObjetivo && ESTADOS_QUE_CUENTAN.has(p.estado)) {
      total += p.total;
    }
  }
  for (const v of ventasRapidas) {
    if (v.fecha === fechaObjetivo) {
      total += v.monto;
    }
  }
  return total;
}

/**
 * Suma de ventas (pedidos cerrados + ventas rápidas) para un rango de días.
 * El rango es una lista explícita de fechas ISO (no inclusivo).
 *
 * Útil para el resumen semanal donde ya tenés `getWeekDays(monday)`.
 */
export function ventasEnRango(
  pedidos: ReadonlyArray<Pedido>,
  ventasRapidas: ReadonlyArray<VentaRapida>,
  fechas: ReadonlyArray<string>,
): number {
  if (fechas.length === 0) return 0;
  const set = new Set(fechas);
  let total = 0;
  for (const p of pedidos) {
    if (set.has(p.fecha) && ESTADOS_QUE_CUENTAN.has(p.estado)) {
      total += p.total;
    }
  }
  for (const v of ventasRapidas) {
    if (set.has(v.fecha)) {
      total += v.monto;
    }
  }
  return total;
}
