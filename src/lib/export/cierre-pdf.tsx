"use client";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { CierreData } from "@/lib/export/cierre-text";
import { buildCierreResumen } from "@/lib/export/cierre-text";
import { formatFechaLarga, formatHora } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: { borderBottom: "1 solid #888", paddingBottom: 8, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#555" },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#444",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "1 dotted #ddd",
  },
  rowLast: { borderBottom: "none" },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#666" },
  totalsBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f4f4f4",
    borderRadius: 4,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTop: "1 solid #444",
  },
  balance: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: "#666", marginTop: 12, textAlign: "center" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f4",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottom: "1 dotted #ddd",
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

  return (
    <Document title={`Cierre Antojos ${data.fecha}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Rotisería Antojos — Cierre del día</Text>
          <Text style={styles.subtitle}>{formatFechaLarga(data.fecha)}</Text>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Pedidos cerrados</Text>
            <Text style={styles.bold}>{resumen.cantidadPedidos}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Ventas totales</Text>
            <Text style={styles.bold}>{formatCurrency(resumen.totalVentas)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Gastos totales</Text>
            <Text style={styles.bold}>{formatCurrency(resumen.totalGastos)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={styles.balance}>Balance</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pedidos ({pedidosCerrados.length})</Text>
          {pedidosCerrados.length === 0 ? (
            <Text style={styles.muted}>No hay pedidos cerrados en esta fecha.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={{ width: 35 }}>#</Text>
                <Text style={{ flex: 1 }}>Cliente</Text>
                <Text style={{ width: 50 }}>Hora</Text>
                <Text style={{ width: 45 }}>Items</Text>
                <Text style={{ width: 70, textAlign: "right" }}>Total</Text>
              </View>
              {pedidosCerrados.map((p) => (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={{ width: 35 }}>#{p.numero}</Text>
                  <Text style={{ flex: 1 }}>{p.nombreCliente}</Text>
                  <Text style={{ width: 50 }}>{formatHora(p.hora)}</Text>
                  <Text style={{ width: 45 }}>{p.items.length}</Text>
                  <Text style={{ width: 70, textAlign: "right" }}>
                    {formatCurrency(p.total)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos ({data.gastos.length})</Text>
          {data.gastos.length === 0 ? (
            <Text style={styles.muted}>No hay gastos registrados en esta fecha.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={{ flex: 1 }}>Descripción</Text>
                <Text style={{ width: 80 }}>Categoría</Text>
                <Text style={{ width: 70, textAlign: "right" }}>Monto</Text>
              </View>
              {data.gastos.map((g) => (
                <View key={g.id} style={styles.tableRow}>
                  <Text style={{ flex: 1 }}>{g.descripcion}</Text>
                  <Text style={{ width: 80 }}>{g.categoria.replace(/_/g, " ")}</Text>
                  <Text style={{ width: 70, textAlign: "right" }}>
                    {formatCurrency(g.monto)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.small}>
          Generado por Antojos · {new Date().toLocaleString("es-AR")}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateCierrePdf(data: CierreData): Promise<Blob> {
  const blob = await pdf(<CierreDocument data={data} />).toBlob();
  return blob;
}