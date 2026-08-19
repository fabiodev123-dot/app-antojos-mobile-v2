import { describe, it, expect } from "vitest";
import { buildCierreResumen } from "./cierre-text";

describe("buildCierreResumen", () => {
  it("suma ventas de pedidos cerrados (sin ventas rapidas)", () => {
    const data = {
      fecha: "2026-08-18",
      pedidos: [
        { id: "1", estado: "entregado", total: 5000, fecha: "2026-08-18" } as never,
        { id: "2", estado: "listo", total: 3000, fecha: "2026-08-18" } as never,
        { id: "3", estado: "pendiente", total: 9999, fecha: "2026-08-18" } as never,
      ],
      gastos: [{ id: "g1", monto: 1000, fecha: "2026-08-18" } as never],
    };
    const r = buildCierreResumen(data);
    expect(r.totalVentas).toBe(8000);
    expect(r.cantidadPedidos).toBe(2);
    expect(r.totalGastos).toBe(1000);
    expect(r.balance).toBe(7000);
  });

  it("suma ventas rapidas al totalVentas y las cuenta como pedido", () => {
    const data = {
      fecha: "2026-08-18",
      pedidos: [
        { id: "1", estado: "entregado", total: 5000, fecha: "2026-08-18" } as never,
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
    const data = {
      fecha: "2026-08-18",
      pedidos: [
        { id: "1", estado: "entregado", total: 1000, fecha: "2026-08-18" } as never,
      ],
      gastos: [],
    };
    const r = buildCierreResumen(data);
    expect(r.totalVentas).toBe(1000);
    expect(r.cantidadPedidos).toBe(1);
  });
});
