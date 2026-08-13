import { pedidosRepository } from "@/lib/repositories";
import type { CreateInput, UpdateInput } from "@/lib/repositories/types";
import type { EstadoPedido, Pedido } from "@/lib/types";
import { consumeStockFromPedido, restoreStockFromPedido } from "@/lib/stock/producto-stock";

/**
 * Crea un pedido y dispara el consumo automático de stock
 * basado en las recetas de los productos vendidos.
 */
export function createPedido(data: CreateInput<Pedido>): Pedido {
  const pedido = pedidosRepository.create(data);
  consumeStockFromPedido(pedido);
  return pedido;
}

/**
 * Cambia el estado de un pedido. Si pasa a "cancelado" revierte
 * el stock consumido.
 *
 * Devuelve el pedido actualizado.
 */
export function transitionPedidoEstado(
  pedidoId: string,
  nuevoEstado: EstadoPedido,
  extras: UpdateInput<Pedido> = {},
): Pedido {
  const anterior = pedidosRepository.get(pedidoId);
  if (!anterior) throw new Error(`Pedido no encontrado: ${pedidoId}`);

  const updated = pedidosRepository.update(pedidoId, {
    estado: nuevoEstado,
    ...extras,
  });

  // Si pasa a cancelado desde un estado que consume stock, revertir.
  if (nuevoEstado === "cancelado" && anterior.estado !== "cancelado") {
    restoreStockFromPedido(anterior);
  }

  return updated;
}

/**
 * Elimina un pedido y revierte el stock consumido.
 */
export function deletePedido(pedidoId: string): boolean {
  const pedido = pedidosRepository.get(pedidoId);
  if (!pedido) return false;

  // Si el pedido consumió stock (no estaba cancelado), revertir.
  if (pedido.estado !== "cancelado") {
    restoreStockFromPedido(pedido);
  }

  return pedidosRepository.delete(pedidoId);
}