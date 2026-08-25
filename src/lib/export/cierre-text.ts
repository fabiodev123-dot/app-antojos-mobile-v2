import type { Gasto, Pedido, VentaRapida } from "@/lib/types";
import { formatFechaLarga, formatPrecio } from "@/lib/format";

export type PeriodoTipo = "diario" | "semanal" | "mensual";

export interface ProductoVendidoItem {
  nombreProducto: string;
  cantidad: number;
  subtotal: number;
}

export interface CierreData {
  fecha: string;
  periodo?: PeriodoTipo;
  periodoLabel?: string;
  pedidos: Pedido[];
  gastos: Gasto[];
  ventasRapidas?: VentaRapida[];
}

export function getConsolidadoProductos(pedidos: Pedido[]): ProductoVendidoItem[] {
  const map = new Map<string, { cantidad: number; subtotal: number }>();
  const pedidosCerrados = pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  for (const p of pedidosCerrados) {
    for (const it of p.items) {
      const nombre = it.nombreProducto || "Sin nombre";
      const existing = map.get(nombre) ?? { cantidad: 0, subtotal: 0 };
      existing.cantidad += it.cantidad;
      existing.subtotal += it.subtotal || it.precioUnitario * it.cantidad;
      map.set(nombre, existing);
    }
  }
  return Array.from(map.entries())
    .map(([nombreProducto, { cantidad, subtotal }]) => ({
      nombreProducto,
      cantidad,
      subtotal,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function buildCierreResumen(data: CierreData): {
  totalVentas: number;
  cantidadPedidos: number;
  totalGastos: number;
  balance: number;
  totalUnidades: number;
} {
  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  const totalVentasPedidos = pedidosCerrados.reduce((sum, p) => sum + p.total, 0);
  const ventasRapidas = (data.ventasRapidas ?? []).filter((v) =>
    data.periodo && data.periodo !== "diario" ? true : v.fecha === data.fecha,
  );
  const totalVentasRapidas = ventasRapidas.reduce((sum, v) => sum + v.monto, 0);
  const totalVentas = totalVentasPedidos + totalVentasRapidas;
  const cantidadPedidos = pedidosCerrados.length + ventasRapidas.length;
  const totalGastos = data.gastos.reduce((sum, g) => sum + g.monto, 0);
  const balance = totalVentas - totalGastos;
  const totalUnidades = pedidosCerrados.reduce(
    (sum, p) => sum + p.items.reduce((s, it) => s + it.cantidad, 0),
    0,
  );
  return { totalVentas, cantidadPedidos, totalGastos, balance, totalUnidades };
}

export function buildCierreText(data: CierreData): string {
  const resumen = buildCierreResumen(data);
  const label = data.periodoLabel ?? formatFechaLarga(data.fecha);
  const tituloPeriodo =
    data.periodo === "semanal"
      ? "CIERRE SEMANAL"
      : data.periodo === "mensual"
        ? "CIERRE MENSUAL"
        : "CIERRE DIARIO";

  const lines: string[] = [];
  lines.push(`🌙 *${tituloPeriodo} — ${label}*`);
  lines.push("");
  lines.push(`📦 Pedidos cerrados: ${resumen.cantidadPedidos}`);
  lines.push(`🍽️ Unidades vendidas: ${resumen.totalUnidades}`);
  lines.push(`💰 Ventas: ${formatPrecio(resumen.totalVentas)}`);
  lines.push(`💸 Gastos: ${formatPrecio(resumen.totalGastos)}`);
  lines.push("");
  lines.push(
    resumen.balance >= 0
      ? `✅ *Balance: ${formatPrecio(resumen.balance)}*`
      : `⚠️ *Balance negativo: ${formatPrecio(resumen.balance)}*`,
  );

  const consolidados = getConsolidadoProductos(data.pedidos);
  if (consolidados.length > 0) {
    lines.push("");
    lines.push("*Platos y unidades más vendidas:*");
    for (const c of consolidados.slice(0, 10)) {
      lines.push(`• ${c.cantidad}× ${c.nombreProducto} (${formatPrecio(c.subtotal)})`);
    }
  }

  if (data.gastos.length > 0) {
    lines.push("");
    lines.push("*Gastos:*");
    for (const g of data.gastos) {
      lines.push(`• ${g.descripcion} — ${formatPrecio(g.monto)}`);
    }
  }

  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  if (pedidosCerrados.length > 0) {
    lines.push("");
    lines.push("*Detalle de pedidos:*");
    for (const p of pedidosCerrados) {
      const items = p.items.map((it) => `${it.cantidad}× ${it.nombreProducto}`).join(", ");
      lines.push(`• #${p.numero} ${p.nombreCliente} — ${formatPrecio(p.total)} (${items})`);
    }
  }

  const ventasRapidas = (data.ventasRapidas ?? []).filter((v) =>
    data.periodo && data.periodo !== "diario" ? true : v.fecha === data.fecha,
  );
  if (ventasRapidas.length > 0) {
    lines.push("");
    lines.push("*Ventas rápidas (mostrador):*");
    for (const v of ventasRapidas) {
      const nota = v.nota ? ` (${v.nota})` : "";
      lines.push(`• ${v.hora} — ${formatPrecio(v.monto)}${nota}`);
    }
  }

  lines.push("");
  lines.push("_Generado desde Antojos_");
  return lines.join("\n");
}

export function buildMailtoHref(data: CierreData, destino?: string): string {
  const label = data.periodoLabel ?? formatFechaLarga(data.fecha);
  const subject = `Cierre Antojos — ${label}`;
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

export function filenameForCierre(fecha: string, ext: "pdf" | "xlsx" | "txt", periodo?: PeriodoTipo): string {
  const pfx = periodo ? `cierre-${periodo}` : "cierre";
  return `${pfx}-antojos-${fecha}.${ext}`;
}