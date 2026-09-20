/**
 * Utilidades de fechas. Trabajamos con fechas "civiles" en formato ISO "YYYY-MM-DD"
 * para evitar problemas de zona horaria entre el servidor (UTC en Vercel) y el usuario.
 */

export type ISODate = string; // "YYYY-MM-DD"

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Devuelve la fecha de hoy en la zona horaria dada, como "YYYY-MM-DD". */
export function todayInTimezone(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): ISODate {
  try {
    // Usamos formatToParts (y no el string formateado) para no depender del formato del locale/ICU del runtime.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const iso = `${get("year").padStart(4, "0")}-${get("month").padStart(2, "0")}-${get("day").padStart(2, "0")}`;
    return isISODate(iso) ? iso : now.toISOString().slice(0, 10);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Fecha local del dispositivo (para usar en el cliente), como "YYYY-MM-DD". */
export function localTodayISO(now: Date = new Date()): ISODate {
  return makeISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Hora local del dispositivo "HH:mm" (para usar en el cliente). */
export function localTimeHHmm(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Hora actual "HH:mm" en la zona horaria dada. */
export function nowTimeInTimezone(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const h = (parts.find((p) => p.type === "hour")?.value ?? "00").padStart(2, "0");
    const m = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
    const t = `${h === "24" ? "00" : h}:${m}`;
    return isValidTime(t) ? t : now.toISOString().slice(11, 16);
  } catch {
    return now.toISOString().slice(11, 16);
  }
}

/** Convierte "YYYY-MM-DD" a un Date UTC a medianoche (para columnas @db.Date). */
export function toDbDate(iso: ISODate): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Convierte un Date (de una columna @db.Date) a "YYYY-MM-DD". */
export function fromDbDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function parseISO(iso: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function makeISO(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toDbDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDbDate(d);
}

/** Suma meses manteniendo el dia cuando es posible (31 ene + 1 mes = 28/29 feb). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const { year, month, day } = parseISO(iso);
  const totalMonths = year * 12 + (month - 1) + months;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  const newDay = Math.min(day, daysInMonth(newYear, newMonth));
  return makeISO(newYear, newMonth, newDay);
}

export function startOfMonth(iso: ISODate): ISODate {
  const { year, month } = parseISO(iso);
  return makeISO(year, month, 1);
}

export function endOfMonth(iso: ISODate): ISODate {
  const { year, month } = parseISO(iso);
  return makeISO(year, month, daysInMonth(year, month));
}

/** Dia de la semana: 0 = domingo ... 6 = sabado. */
export function dayOfWeek(iso: ISODate): number {
  return toDbDate(iso).getUTCDay();
}

/** Inicio de semana (lunes). */
export function startOfWeek(iso: ISODate): ISODate {
  const dow = dayOfWeek(iso);
  const diff = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -diff);
}

export function endOfWeek(iso: ISODate): ISODate {
  return addDays(startOfWeek(iso), 6);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / 86_400_000);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_ES_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAYS_ES_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function monthName(month: number, short = false): string {
  return (short ? MONTHS_ES_SHORT : MONTHS_ES)[month - 1] ?? "";
}

export function weekdayName(iso: ISODate, short = false): string {
  return (short ? WEEKDAYS_ES_SHORT : WEEKDAYS_ES)[dayOfWeek(iso)];
}

/** "18/09/2026" */
export function formatDateShort(iso: ISODate): string {
  const { year, month, day } = parseISO(iso);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** "jue 18 sep" / "jueves 18 de septiembre de 2026" */
export function formatDateHuman(iso: ISODate, options?: { long?: boolean; today?: ISODate }): string {
  if (options?.today) {
    if (iso === options.today) return "Hoy";
    if (iso === addDays(options.today, -1)) return "Ayer";
  }
  const { year, month, day } = parseISO(iso);
  if (options?.long) {
    return `${weekdayName(iso)} ${day} de ${monthName(month)} de ${year}`;
  }
  const showYear = options?.today ? parseISO(options.today).year !== year : false;
  return `${weekdayName(iso, true)} ${day} ${monthName(month, true)}${showYear ? ` ${year}` : ""}`;
}

/** "Septiembre 2026" */
export function formatMonthYear(year: number, month: number): string {
  const name = monthName(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

/** Clave "YYYY-MM" para agrupar por mes. */
export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

/** Clave de semana: fecha ISO del lunes de esa semana. */
export function weekKey(iso: ISODate): string {
  return startOfWeek(iso);
}
