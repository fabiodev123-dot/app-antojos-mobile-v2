import { describe, it, expect } from "vitest";
import {
  ventaRapidaFormSchema,
  ventaRapidaCreateSchema,
} from "./entities";

describe("ventaRapidaFormSchema", () => {
  it("acepta input válido mínimo", () => {
    const r = ventaRapidaFormSchema.safeParse({ monto: "5000", hora: "23:30" });
    expect(r.success).toBe(true);
  });

  it("rechaza monto vacío", () => {
    const r = ventaRapidaFormSchema.safeParse({ monto: "", hora: "23:30" });
    expect(r.success).toBe(false);
  });

  it("rechaza monto con letras", () => {
    const r = ventaRapidaFormSchema.safeParse({ monto: "5k", hora: "23:30" });
    expect(r.success).toBe(false);
  });

  it("rechaza monto con decimales (no aceptamos centavos)", () => {
    const r = ventaRapidaFormSchema.safeParse({ monto: "5.5", hora: "23:30" });
    expect(r.success).toBe(false);
  });

  it("rechaza monto negativo o cero", () => {
    const r0 = ventaRapidaFormSchema.safeParse({ monto: "0", hora: "12:00" });
    expect(r0.success).toBe(false);
  });

  it("rechaza monto demasiado grande", () => {
    const r = ventaRapidaFormSchema.safeParse({
      monto: "10000000",
      hora: "12:00",
    });
    expect(r.success).toBe(false);
  });

  it("acepta nota opcional", () => {
    const r = ventaRapidaFormSchema.safeParse({
      monto: "1000",
      hora: "12:00",
      nota: "sin delivery",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza nota demasiado larga", () => {
    const r = ventaRapidaFormSchema.safeParse({
      monto: "1000",
      hora: "12:00",
      nota: "x".repeat(121),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza hora inválida", () => {
    const r1 = ventaRapidaFormSchema.safeParse({ monto: "100", hora: "25:00" });
    expect(r1.success).toBe(false);
    const r2 = ventaRapidaFormSchema.safeParse({ monto: "100", hora: "9:00" });
    expect(r2.success).toBe(false);
  });
});

describe("ventaRapidaCreateSchema", () => {
  it("acepta create válido", () => {
    const r = ventaRapidaCreateSchema.safeParse({
      fecha: "2026-08-18",
      hora: "23:45",
      monto: 5000,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza fecha en formato incorrecto", () => {
    const r = ventaRapidaCreateSchema.safeParse({
      fecha: "18/08/2026",
      hora: "23:45",
      monto: 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza monto no entero", () => {
    const r = ventaRapidaCreateSchema.safeParse({
      fecha: "2026-08-18",
      hora: "23:45",
      monto: 5.5,
    });
    expect(r.success).toBe(false);
  });
});
