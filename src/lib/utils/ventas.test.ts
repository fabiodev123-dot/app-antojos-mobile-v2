import { describe, it, expect } from "vitest";
import { ventasDelDia, ventasEnRango } from "./ventas";

describe("ventasDelDia", () => {
  it("suma solo ventas del día indicado, no de otros días", () => {
    const pedidos = [
      { id: "1", fecha: "2026-08-18", estado: "entregado", total: 5000 } as never,
      { id: "2", fecha: "2026-08-18", estado: "listo", total: 3000 } as never,
      { id: "3", fecha: "2026-08-19", estado: "entregado", total: 9999 } as never,
    ];
    const ventas = [
      { id: "v1", fecha: "2026-08-18", monto: 1500 } as never,
      { id: "v2", fecha: "2026-08-19", monto: 800 } as never,
    ];
    expect(ventasDelDia(pedidos, ventas, "2026-08-18")).toBe(9500);
  });

  it("ignora pedidos no cerrados (pendiente, preparando, cancelado)", () => {
    const pedidos = [
      { id: "1", fecha: "2026-08-18", estado: "pendiente", total: 5000 } as never,
      { id: "2", fecha: "2026-08-18", estado: "preparando", total: 3000 } as never,
      { id: "3", fecha: "2026-08-18", estado: "cancelado", total: 2000 } as never,
      { id: "4", fecha: "2026-08-18", estado: "entregado", total: 1000 } as never,
    ];
    expect(ventasDelDia(pedidos, [], "2026-08-18")).toBe(1000);
  });

  it("suma ventas rápidas aunque no haya pedidos", () => {
    const ventas = [
      { id: "v1", fecha: "2026-08-18", monto: 1500 } as never,
      { id: "v2", fecha: "2026-08-18", monto: 800 } as never,
    ];
    expect(ventasDelDia([], ventas, "2026-08-18")).toBe(2300);
  });

  it("devuelve 0 si no hay nada", () => {
    expect(ventasDelDia([], [], "2026-08-18")).toBe(0);
  });
});

describe("ventasEnRango", () => {
  it("suma ventas de varios días, útil para resumen semanal", () => {
    const ventas = [
      { id: "v1", fecha: "2026-08-17", monto: 1000 } as never,
      { id: "v2", fecha: "2026-08-18", monto: 2000 } as never,
      { id: "v3", fecha: "2026-08-19", monto: 3000 } as never,
      { id: "v4", fecha: "2026-08-20", monto: 4000 } as never,
    ];
    expect(ventasEnRango([], ventas, ["2026-08-17", "2026-08-18", "2026-08-19"])).toBe(6000);
  });
});
