export function formatPrecio(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatHora(value: string): string {
  if (!value) return "";
  if (value.includes(":")) return value.slice(0, 5);
  return value;
}

export function formatFechaCorta(iso: string): string {
  if (!iso) return "";
  const date = iso.length === 10 ? new Date(iso + "T00:00:00") : new Date(iso);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

export function formatFechaLarga(iso: string): string {
  if (!iso) return "";
  const date = iso.length === 10 ? new Date(iso + "T00:00:00") : new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}