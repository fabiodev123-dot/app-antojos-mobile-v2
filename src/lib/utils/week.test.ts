import { describe, it, expect } from "vitest";
import { getStartOfWeek, getWeekDays, formatWeekLabel } from "./week";

describe("getStartOfWeek", () => {
  it("devuelve el lunes de la misma semana (caso lunes)", () => {
    // 2026-08-17 es lunes
    expect(getStartOfWeek("2026-08-17")).toBe("2026-08-17");
  });
  it("devuelve el lunes anterior cuando es miércoles", () => {
    // 2026-08-19 es miércoles
    expect(getStartOfWeek("2026-08-19")).toBe("2026-08-17");
  });
  it("devuelve el lunes anterior cuando es domingo", () => {
    // 2026-08-23 es domingo
    expect(getStartOfWeek("2026-08-23")).toBe("2026-08-17");
  });
  it("maneja cambio de mes", () => {
    // 2026-09-02 es miércoles → lunes 2026-08-31
    expect(getStartOfWeek("2026-09-02")).toBe("2026-08-31");
  });
  it("maneja cambio de año", () => {
    // 2027-01-01 es viernes → lunes 2026-12-28
    expect(getStartOfWeek("2027-01-01")).toBe("2026-12-28");
  });
});

describe("getWeekDays", () => {
  it("devuelve 7 días partiendo del lunes dado", () => {
    const days = getWeekDays("2026-08-17");
    expect(days).toEqual([
      "2026-08-17", // lunes
      "2026-08-18", // martes
      "2026-08-19", // miércoles
      "2026-08-20", // jueves
      "2026-08-21", // viernes
      "2026-08-22", // sábado
      "2026-08-23", // domingo
    ]);
  });
  it("atraviesa fin de mes", () => {
    const days = getWeekDays("2026-08-31");
    expect(days[6]).toBe("2026-09-06");
  });
});

describe("formatWeekLabel", () => {
  it("formatea lunes a domingo del mismo mes", () => {
    // 17 ago → 23 ago
    const label = formatWeekLabel("2026-08-17");
    expect(label).toContain("17");
    expect(label).toContain("23");
    expect(label.toLowerCase()).toContain("ago");
  });
  it("formatea跨越 mes", () => {
    // lunes 31 ago → domingo 6 sep
    const label = formatWeekLabel("2026-08-31");
    expect(label).toContain("31");
    expect(label).toContain("6");
  });
});
