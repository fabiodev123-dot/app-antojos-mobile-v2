import {
  movimientosStockRepository,
  productosRepository,
} from "@/lib/repositories";
import type { Pedido } from "@/lib/types";

/**
 * Decrementa el stock de los productos vendidos (platos pre-hechos).
 * Registra un MovimientoStock (tipo "venta") por cada producto consumido.
 *
 * Si un producto ya tiene stockActual = 0, no decrementa más (queda en 0).
 * No es idempotente — el caller debe asegurarse de no invocarlo dos veces.
 */
export function consumeStockFromPedido(pedido: Pedido): void {
  const productos = productosRepository.list();
  const productosById = new Map(productos.map((p) => [p.id, p]));
  const today = pedido.fecha;

  for (const item of pedido.items) {
    const producto = productosById.get(item.productoId);
    if (!producto) continue;

    const nuevoStock = Math.max(0, producto.stockActual - item.cantidad);
    productosRepository.update(item.productoId, { stockActual: nuevoStock });

    movimientosStockRepository.create({
      ingredienteId: item.productoId,
      tipo: "venta",
      cantidad: item.cantidad,
      motivo: `Venta pedido #${pedido.numero} (${pedido.nombreCliente}) — ${item.cantidad}× ${producto.nombre}`,
      pedidoId: pedido.id,
      fecha: today,
    });
  }
}

/**
 * Revierte el consumo de stock hecho por consumeStockFromPedido.
 * Usado al cancelar o eliminar un pedido.
 */
export function restoreStockFromPedido(pedido: Pedido): void {
  const productos = productosRepository.list();
  const productosById = new Map(productos.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  for (const item of pedido.items) {
    const producto = productosById.get(item.productoId);
    if (!producto) continue;

    productosRepository.update(item.productoId, {
      stockActual: producto.stockActual + item.cantidad,
    });

    movimientosStockRepository.create({
      ingredienteId: item.productoId,
      tipo: "entrada",
      cantidad: item.cantidad,
      motivo: `Reversa pedido #${pedido.numero} (${pedido.estado}) — ${item.cantidad}× ${producto.nombre}`,
      pedidoId: pedido.id,
      fecha: today,
    });
  }
}