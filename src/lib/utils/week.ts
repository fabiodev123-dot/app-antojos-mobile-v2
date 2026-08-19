/**
 * Helpers de semana (lunes a domingo, ISO 8601).
 *
 * Argentina usa lun-dom en la práctica. Si el cliente prefiere dom-sáb,
 * basta con cambiar la constante del primer día y los tests.
 *
 * Importante: las funciones reciben y devuelven fechas ISO `YYYY-MM-DD`
 * (sin hora), consistentes con `Pedido.fecha` y `hoy()` en `lib/format.ts`.
 * Esto evita problemas de zona horaria al comparar días.
 */

const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

/**
 * Convierte un ISO date `YYYY-MM-DD` a `Date` local sin pisar la zona horaria.
 * `new Date("2026-08-17")` se interpreta como UTC midnight, lo que en ART
 * (UTC-3) cae en 2026-08-16 21:00 local → getDay() puede devolver el día
 * anterior. Por eso parseamos manualmente.
 */
function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Devuelve el lunes (ISO `YYYY-MM-DD`) de la semana de la fecha dada.
 * Semana = lunes a domingo (ISO 8601).
 *
 * @example
 * getStartOfWeek("2026-08-19") // miércoles → "2026-08-17"
 * getStartOfWeek("2026-08-23") // domingo   → "2026-08-17"
 */
export function getStartOfWeek(isoDate: string): string {
  const d = parseIsoLocal(isoDate);
  const day = d.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  const diff = day === 0 ? -6 : 1 - day; // domingo ajusta a -6
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Devuelve array de 7 strings ISO (`YYYY-MM-DD`), lunes a domingo,
 * partiendo del lunes dado.
 *
 * @example
 * getWeekDays("2026-08-17") // ["2026-08-17", ..., "2026-08-23"]
 */
export function getWeekDays(mondayIso: string): string[] {
  const start = parseIsoLocal(mondayIso);
  const result: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    result.push(`${yyyy}-${mm}-${dd}`);
  }
  return result;
}

/**
 * Devuelve un label corto para la semana, ej. `"17–23 ago"`.
 * Si la semana cruza de mes, muestra ambos: `"31 ago – 6 sep"`.
 */
export function formatWeekLabel(mondayIso: string): string {
  const days = getWeekDays(mondayIso);
  const start = parseIsoLocal(days[0]);
  const end = parseIsoLocal(days[6]);
  const sameMonth = start.getMonth() === end.getMonth();
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  if (sameMonth) {
    return `${startDay}–${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}
