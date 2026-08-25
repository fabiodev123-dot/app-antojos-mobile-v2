import { describe, it, expect } from "vitest";
import { buildCierreResumen, getConsolidadoProductos, type CierreData } from "./cierre-text";

describe("buildCierreResumen", () => {
  it("suma ventas de pedidos cerrados (sin ventas rapidas)", () => {
    const data: CierreData = {
      fecha: "2026-08-18",
      pedidos: [
        { id: "1", estado: "entregado", total: 5000, fecha: "2026-08-18", items: [{ cantidad: 2, nombreProducto: "Empanada", subtotal: 5000 }] } as never,
        { id: "2", estado: "listo", total: 3000, fecha: "2026-08-18", items: [{ cantidad: 1, nombreProducto: "Milanesa", subtotal: 3000 }] } as never,
        { id: "3", estado: "pendiente", total: 9999, fecha: "2026-08-18", items: [] } as never,
      ],
      gastos: [{ id: "g1", monto: 1000, fecha: "2026-08-18" } as never],
    };
    const r = buildCierreResumen(data);
    expect(r.totalVentas).toBe(8000);
    expect(r.cantidadPedidos).toBe(2);
    expect(r.totalGastos).toBe(1000);
    expect(r.balance).toBe(7000);
    expect(r.totalUnidades).toBe(3);
  });

  it("suma ventas rapidas al totalVentas y las cuenta como pedido", () => {
    const data: CierreData = {
      fecha: "2026-08-18",
      pedidos: [
        { id: "1", estado: "entregado", total: 5000, fecha: "2026-08-18", items: [{ cantidad: 1, nombreProducto: "Pizza", subtotal: 5000 }] } as never,
      ],
      ventasRapidas: [
        { id: "v1", monto: 1500, fecha: "2026-08-18" } as never,
        { id: "v2", monto: 800, fecha: "2026-08-18" } as never,
      ],
      gastos: [],
    };
    const r = buildCierreResumen(data);
    expect(r.totalVentas).toBe(7300); // 5000 + 1500 + 800
    expect(r.cantidadPedidos).toBe(3); // 1 pedido + 2 ventas rapidas
    expect(r.totalGastos).toBe(0);
    expect(r.balance).toBe(7300);
  });

  it("funciona sin ventas rapidas (back-compat)", () => {
    const data: CierreData = {
      fecha: "2026-08-18",
      pedidos: [
        { id: "1", estado: "entregado", total: 1000, fecha: "2026-08-18", items: [] } as never,
      ],
      gastos: [],
    };
    const r = buildCierreResumen(data);
    expect(r.totalVentas).toBe(1000);
    expect(r.cantidadPedidos).toBe(1);
  });

  it("calcula consolidado de productos correctamente", () => {
    const pedidos = [
      {
        id: "1",
        estado: "entregado",
        items: [
          { nombreProducto: "Empanada", cantidad: 4, subtotal: 4000 },
          { nombreProducto: "Coca Cola", cantidad: 2, subtotal: 2000 },
        ],
      },
      {
        id: "2",
        estado: "listo",
        items: [
          { nombreProducto: "Empanada", cantidad: 6, subtotal: 6000 },
          { nombreProducto: "Pizza", cantidad: 1, subtotal: 8000 },
        ],
      },
      {
        id: "3",
        estado: "cancelado",
        items: [{ nombreProducto: "Empanada", cantidad: 10, subtotal: 10000 }],
      },
    ] as never[];

    const consolidados = getConsolidadoProductos(pedidos);
    expect(consolidados).toHaveLength(3);
    expect(consolidados[0].nombreProducto).toBe("Empanada");
    expect(consolidados[0].cantidad).toBe(10); // 4 + 6 (ignora pedido cancelado)
    expect(consolidados[0].subtotal).toBe(10000);
  });
});
