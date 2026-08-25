"use client";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { CierreData } from "@/lib/export/cierre-text";
import { buildCierreResumen, getConsolidadoProductos } from "@/lib/export/cierre-text";
import { formatFechaLarga, formatHora } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  header: { borderBottom: "2 solid #ff6600", paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 8, color: "#ff6600", fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#555" },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#333",
    borderBottom: "1 solid #e5e5e5",
    paddingBottom: 2,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#666" },
  totalsBox: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#fafafa",
    borderRadius: 4,
    border: "1 solid #e5e5e5",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    marginTop: 4,
    borderTop: "1.5 solid #333",
  },
  balance: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 7.5, color: "#777", marginTop: 10, textAlign: "center" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    borderBottom: "1 solid #ccc",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderBottom: "1 dotted #e0e0e0",
  },
});

function formatCurrency(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  });
}

function CierreDocument({ data }: { data: CierreData }) {
  const resumen = buildCierreResumen(data);
  const pedidosCerrados = data.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  const ventasRapidas = (data.ventasRapidas ?? []).filter((v) =>
    data.periodo && data.periodo !== "diario" ? true : v.fecha === data.fecha,
  );
  const consolidados = getConsolidadoProductos(data.pedidos);

  const tituloPeriodo =
    data.periodo === "semanal"
      ? "Cierre Semanal"
      : data.periodo === "mensual"
        ? "Cierre Mensual"
        : "Cierre del Día";

  const labelPeriodo = data.periodoLabel ?? formatFechaLarga(data.fecha);

  return (
    <Document title={`Cierre Antojos ${data.fecha}`}>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.brand}>Rotisería Antojos</Text>
          <Text style={styles.title}>{tituloPeriodo}</Text>
          <Text style={styles.subtitle}>{labelPeriodo}</Text>
        </View>

        {/* Resumen Financiero */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Pedidos cerrados</Text>
            <Text style={styles.bold}>{pedidosCerrados.length}</Text>
          </View>
          {ventasRapidas.length > 0 ? (
            <View style={styles.totalsRow}>
              <Text>Ventas rápidas (mostrador)</Text>
              <Text style={styles.bold}>{ventasRapidas.length}</Text>
            </View>
          ) : null}
          <View style={styles.totalsRow}>
            <Text>Total platos / unidades vendidas</Text>
            <Text style={styles.bold}>{resumen.totalUnidades} un.</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Ventas totales facturadas</Text>
            <Text style={[styles.bold, { color: "#166534" }]}>
              {formatCurrency(resumen.totalVentas)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Gastos totales</Text>
            <Text style={[styles.bold, { color: "#991b1b" }]}>
              {formatCurrency(resumen.totalGastos)}
            </Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={styles.balance}>Balance Ganancia / Pérdida</Text>
            <Text
              style={[
                styles.balance,
                { color: resumen.balance >= 0 ? "#166534" : "#991b1b" },
              ]}
            >
              {formatCurrency(resumen.balance)}
            </Text>
          </View>
        </View>

        {/* Resumen de Unidades Vendidas por Producto */}
        {consolidados.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Platos y Unidades Vendidas ({consolidados.length} variedades)
            </Text>
            <View>
              <View style={styles.tableHeader}>
                <Text style={{ flex: 1 }}>Plato / Producto</Text>
                <Text style={{ width: 70, textAlign: "center" }}>Cantidad</Text>
                <Text style={{ width: 85, textAlign: "right" }}>Recaudación</Text>
              </View>
              {consolidados.map((item, idx) => (
                <View key={`prod-${idx}`} style={styles.tableRow}>
                  <Text style={{ flex: 1 }}>{item.nombreProducto}</Text>
                  <Text style={{ width: 70, textAlign: "center", fontFamily: "Helvetica-Bold" }}>
                    {item.cantidad} un.
                  </Text>
                  <Text style={{ width: 85, textAlign: "right" }}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Detalle de Pedidos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detalle de Pedidos ({pedidosCerrados.length})
          </Text>
          {pedidosCerrados.length === 0 ? (
            <Text style={styles.muted}>No hay pedidos cerrados en este período.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={{ width: 32 }}>#</Text>
                <Text style={{ width: 90 }}>Cliente</Text>
                <Text style={{ width: 45 }}>Hora</Text>
                <Text style={{ flex: 1 }}>Ítems / Unidades</Text>
                <Text style={{ width: 70, textAlign: "right" }}>Total</Text>
              </View>
              {pedidosCerrados.map((p) => {
                const itemsStr = p.items
                  .map((it) => `${it.cantidad}× ${it.nombreProducto}`)
                  .join(", ");
                return (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={{ width: 32 }}>#{p.numero}</Text>
                    <Text style={{ width: 90 }}>{p.nombreCliente}</Text>
                    <Text style={{ width: 45 }}>{formatHora(p.hora)}</Text>
                    <Text style={{ flex: 1, color: "#444" }}>{itemsStr}</Text>
                    <Text style={{ width: 70, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                      {formatCurrency(p.total)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Ventas Rápidas (Mostrador) */}
        {ventasRapidas.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ventas Rápidas en Mostrador ({ventasRapidas.length})
            </Text>
            <View>
              <View style={styles.tableHeader}>
                <Text style={{ width: 50 }}>Hora</Text>
                <Text style={{ flex: 1 }}>Nota / Concepto</Text>
                <Text style={{ width: 80, textAlign: "right" }}>Monto</Text>
              </View>
              {ventasRapidas.map((v) => (
                <View key={v.id} style={styles.tableRow}>
                  <Text style={{ width: 50 }}>{v.hora || "—"}</Text>
                  <Text style={{ flex: 1, color: "#555" }}>
                    {v.nota || "Venta rápida mostrador"}
                  </Text>
                  <Text style={{ width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                    {formatCurrency(v.monto)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Detalle de Gastos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos ({data.gastos.length})</Text>
          {data.gastos.length === 0 ? (
            <Text style={styles.muted}>No hay gastos registrados en este período.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={{ flex: 1 }}>Descripción</Text>
                <Text style={{ width: 90 }}>Categoría</Text>
                <Text style={{ width: 75, textAlign: "right" }}>Monto</Text>
              </View>
              {data.gastos.map((g) => (
                <View key={g.id} style={styles.tableRow}>
                  <Text style={{ flex: 1 }}>{g.descripcion}</Text>
                  <Text style={{ width: 90 }}>{g.categoria.replace(/_/g, " ")}</Text>
                  <Text style={{ width: 75, textAlign: "right", color: "#991b1b" }}>
                    {formatCurrency(g.monto)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.small}>
          Generado por Rotisería Antojos · {new Date().toLocaleString("es-AR")}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateCierrePdf(data: CierreData): Promise<Blob> {
  const blob = await pdf(<CierreDocument data={data} />).toBlob();
  return blob;
}