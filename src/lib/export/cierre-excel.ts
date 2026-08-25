"use client";

import ExcelJS from "exceljs";
import type { CierreData } from "@/lib/export/cierre-text";
import { buildCierreResumen, getConsolidadoProductos } from "@/lib/export/cierre-text";
import { formatFechaLarga, formatHora } from "@/lib/format";

export async function generateCierreExcel(data: CierreData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rotisería Antojos";
  wb.created = new Date();

  const resumen = buildCierreResumen(data);
  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  const ventasRapidas = (data.ventasRapidas ?? []).filter((v) =>
    data.periodo && data.periodo !== "diario" ? true : v.fecha === data.fecha,
  );
  const consolidados = getConsolidadoProductos(data.pedidos);

  const labelPeriodo = data.periodoLabel ?? formatFechaLarga(data.fecha);

  // 1. Pestaña Resumen
  const resumenSheet = wb.addWorksheet("Resumen", {
    properties: { tabColor: { argb: "FFE0E0E0" } },
  });
  resumenSheet.columns = [
    { header: "Concepto", key: "concepto", width: 30 },
    { header: "Valor", key: "valor", width: 22 },
  ];

  resumenSheet.getRow(1).font = { bold: true };
  resumenSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  resumenSheet.addRow({ concepto: "Período", valor: labelPeriodo });
  resumenSheet.addRow({ concepto: "Pedidos cerrados", valor: pedidosCerrados.length });
  resumenSheet.addRow({ concepto: "Ventas rápidas (mostrador)", valor: ventasRapidas.length });
  resumenSheet.addRow({ concepto: "Total unidades vendidas", valor: resumen.totalUnidades });
  resumenSheet.addRow({ concepto: "Ventas totales facturadas", valor: resumen.totalVentas });
  resumenSheet.addRow({ concepto: "Gastos totales", valor: resumen.totalGastos });
  resumenSheet.addRow({ concepto: "Balance", valor: resumen.balance });

  resumenSheet.getColumn("valor").numFmt = "#,##0";
  resumenSheet.getCell("B7").font = { bold: true, size: 13 };
  resumenSheet.getCell("B7").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: resumen.balance >= 0 ? "FFD1FAE5" : "FFFEE2E2" },
  };

  // 2. Pestaña Unidades Vendidas
  if (consolidados.length > 0) {
    const prodSheet = wb.addWorksheet("Unidades Vendidas", {
      properties: { tabColor: { argb: "FFFEF08A" } },
    });
    prodSheet.columns = [
      { header: "Plato / Producto", key: "nombre", width: 35 },
      { header: "Cantidad Vendida", key: "cantidad", width: 18 },
      { header: "Recaudación Total", key: "subtotal", width: 20 },
    ];
    prodSheet.getRow(1).font = { bold: true };
    prodSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF08A" },
    };

    for (const c of consolidados) {
      prodSheet.addRow({
        nombre: c.nombreProducto,
        cantidad: c.cantidad,
        subtotal: c.subtotal,
      });
    }
    prodSheet.getColumn("cantidad").numFmt = "#,##0";
    prodSheet.getColumn("subtotal").numFmt = "#,##0";
  }

  // 3. Pestaña Pedidos
  const pedidosSheet = wb.addWorksheet("Pedidos", {
    properties: { tabColor: { argb: "FFDBEAFE" } },
  });
  pedidosSheet.columns = [
    { header: "#", key: "numero", width: 6 },
    { header: "Cliente", key: "cliente", width: 25 },
    { header: "Hora", key: "hora", width: 10 },
    { header: "Items / Detalle", key: "items", width: 40 },
    { header: "Canal", key: "canal", width: 12 },
    { header: "Entrega", key: "entrega", width: 12 },
    { header: "Total", key: "total", width: 14 },
  ];
  pedidosSheet.getRow(1).font = { bold: true };
  pedidosSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDBEAFE" },
  };

  for (const p of pedidosCerrados) {
    const itemsStr = p.items.map((it) => `${it.cantidad}x ${it.nombreProducto}`).join(", ");
    pedidosSheet.addRow({
      numero: p.numero,
      cliente: p.nombreCliente,
      hora: formatHora(p.hora),
      items: itemsStr,
      canal: p.canal,
      entrega: p.tipoEntrega,
      total: p.total,
    });
  }
  pedidosSheet.getColumn("total").numFmt = "#,##0";

  // 4. Pestaña Ventas Rápidas
  if (ventasRapidas.length > 0) {
    const vrSheet = wb.addWorksheet("Ventas Rápidas", {
      properties: { tabColor: { argb: "FFFED7AA" } },
    });
    vrSheet.columns = [
      { header: "Hora / Fecha", key: "hora", width: 14 },
      { header: "Nota / Concepto", key: "nota", width: 35 },
      { header: "Monto", key: "monto", width: 15 },
    ];
    vrSheet.getRow(1).font = { bold: true };
    vrSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFED7AA" },
    };

    for (const v of ventasRapidas) {
      vrSheet.addRow({
        hora: v.hora || v.fecha,
        nota: v.nota || "Venta rápida mostrador",
        monto: v.monto,
      });
    }
    vrSheet.getColumn("monto").numFmt = "#,##0";
  }

  // 5. Pestaña Gastos
  const gastosSheet = wb.addWorksheet("Gastos", {
    properties: { tabColor: { argb: "FFFEE2E2" } },
  });
  gastosSheet.columns = [
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Categoría", key: "categoria", width: 20 },
    { header: "Monto", key: "monto", width: 14 },
  ];
  gastosSheet.getRow(1).font = { bold: true };
  gastosSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEE2E2" },
  };

  for (const g of data.gastos) {
    gastosSheet.addRow({
      descripcion: g.descripcion,
      categoria: g.categoria.replace(/_/g, " "),
      monto: g.monto,
    });
  }
  gastosSheet.getColumn("monto").numFmt = "#,##0";

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}