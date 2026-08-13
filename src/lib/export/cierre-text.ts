import type { Gasto, Pedido } from "@/lib/types";
import { formatFechaLarga, formatPrecio } from "@/lib/format";

interface CierreData {
  fecha: string;
  pedidos: Pedido[];
  gastos: Gasto[];
}

export function buildCierreResumen(data: CierreData): {
  totalVentas: number;
  cantidadPedidos: number;
  totalGastos: number;
  balance: number;
} {
  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  const totalVentas = pedidosCerrados.reduce((sum, p) => sum + p.total, 0);
  const cantidadPedidos = pedidosCerrados.length;
  const totalGastos = data.gastos.reduce((sum, g) => sum + g.monto, 0);
  const balance = totalVentas - totalGastos;
  return { totalVentas, cantidadPedidos, totalGastos, balance };
}

export function buildCierreText(data: CierreData): string {
  const resumen = buildCierreResumen(data);
  const lines: string[] = [];
  lines.push(`🌙 *CIERRE — ${formatFechaLarga(data.fecha)}*`);
  lines.push("");
  lines.push(`📦 Pedidos cerrados: ${resumen.cantidadPedidos}`);
  lines.push(`💰 Ventas: ${formatPrecio(resumen.totalVentas)}`);
  lines.push(`💸 Gastos: ${formatPrecio(resumen.totalGastos)}`);
  lines.push("");
  lines.push(
    resumen.balance >= 0
      ? `✅ *Balance: ${formatPrecio(resumen.balance)}*`
      : `⚠️ *Balance negativo: ${formatPrecio(resumen.balance)}*`,
  );

  if (data.gastos.length > 0) {
    lines.push("");
    lines.push("*Gastos del día:*");
    for (const g of data.gastos) {
      lines.push(`• ${g.descripcion} — ${formatPrecio(g.monto)}`);
    }
  }

  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  if (pedidosCerrados.length > 0) {
    lines.push("");
    lines.push("*Pedidos:*");
    for (const p of pedidosCerrados) {
      const items = p.items.map((it) => `${it.cantidad}× ${it.nombreProducto}`).join(", ");
      lines.push(`• #${p.numero} ${p.nombreCliente} — ${formatPrecio(p.total)} (${items})`);
    }
  }

  lines.push("");
  lines.push("_Generado desde Antojos_");
  return lines.join("\n");
}

export function buildMailtoHref(data: CierreData, destino?: string): string {
  const subject = `Cierre Antojos — ${formatFechaLarga(data.fecha)}`;
  const body = buildCierreText(data);
  const params = new URLSearchParams({ subject, body });
  if (destino) params.set("to", destino);
  return `mailto:?${params.toString()}`;
}

export function buildWhatsappHref(data: CierreData, telefono?: string): string {
  const text = buildCierreText(data);
  const params = new URLSearchParams({ text });
  const base = telefono
    ? `https://wa.me/${telefono.replace(/\D/g, "")}`
    : "https://wa.me/";
  return `${base}?${params.toString()}`;
}

export function filenameForCierre(fecha: string, ext: "pdf" | "xlsx" | "txt"): string {
  return `cierre-antojos-${fecha}.${ext}`;
}

export type { CierreData };