"use client";

import ExcelJS from "exceljs";
import type { CierreData } from "@/lib/export/cierre-text";
import { buildCierreResumen } from "@/lib/export/cierre-text";
import { formatHora } from "@/lib/format";

export async function generateCierreExcel(data: CierreData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rotisería Antojos";
  wb.created = new Date();

  const resumen = buildCierreResumen(data);
  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );

  const resumenSheet = wb.addWorksheet("Resumen", {
    properties: { tabColor: { argb: "FFE0E0E0" } },
  });
  resumenSheet.columns = [
    { header: "Concepto", key: "concepto", width: 30 },
    { header: "Valor", key: "valor", width: 20 },
  ];

  resumenSheet.getRow(1).font = { bold: true };
  resumenSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  resumenSheet.addRow({ concepto: "Fecha", valor: data.fecha });
  resumenSheet.addRow({ concepto: "Pedidos cerrados", valor: resumen.cantidadPedidos });
  resumenSheet.addRow({ concepto: "Ventas totales", valor: resumen.totalVentas });
  resumenSheet.addRow({ concepto: "Gastos totales", valor: resumen.totalGastos });
  resumenSheet.addRow({ concepto: "Balance", valor: resumen.balance });

  resumenSheet.getColumn("valor").numFmt = "#,##0";
  resumenSheet.getCell("B6").font = { bold: true, size: 14 };
  resumenSheet.getCell("B6").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: resumen.balance >= 0 ? "FFD1FAE5" : "FFFEE2E2" },
  };

  const pedidosSheet = wb.addWorksheet("Pedidos", {
    properties: { tabColor: { argb: "FFDBEAFE" } },
  });
  pedidosSheet.columns = [
    { header: "#", key: "numero", width: 6 },
    { header: "Cliente", key: "cliente", width: 25 },
    { header: "Hora", key: "hora", width: 10 },
    { header: "Items", key: "items", width: 8 },
    { header: "Canal", key: "canal", width: 12 },
    { header: "Entrega", key: "entrega", width: 12 },
    { header: "Total", key: "total", width: 12 },
  ];
  pedidosSheet.getRow(1).font = { bold: true };
  pedidosSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDBEAFE" },
  };

  for (const p of pedidosCerrados) {
    pedidosSheet.addRow({
      numero: p.numero,
      cliente: p.nombreCliente,
      hora: formatHora(p.hora),
      items: p.items.length,
      canal: p.canal,
      entrega: p.tipoEntrega,
      total: p.total,
    });
  }
  pedidosSheet.getColumn("total").numFmt = "#,##0";

  const gastosSheet = wb.addWorksheet("Gastos", {
    properties: { tabColor: { argb: "FFFEE2E2" } },
  });
  gastosSheet.columns = [
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Categoría", key: "categoria", width: 20 },
    { header: "Monto", key: "monto", width: 12 },
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