import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  formatDateShort,
  formatMonthYear,
  isISODate,
  parseISO,
  startOfMonth,
  startOfWeek,
  type ISODate,
} from "./dates";

export type PeriodKey = "today" | "week" | "month" | "last-month" | "custom";

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export interface ResolvedPeriod extends DateRange {
  key: PeriodKey;
  label: string;
  /** Rango equivalente inmediatamente anterior (para comparar). */
  previous: DateRange;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "last-month", label: "Mes anterior" },
  { key: "custom", label: "Personalizado" },
];

export function isPeriodKey(value: unknown): value is PeriodKey {
  return PERIOD_OPTIONS.some((p) => p.key === value);
}

/**
 * Resuelve un periodo a un rango concreto de fechas, tomando "hoy" como referencia.
 * Para "custom", from/to son obligatorios (si faltan, cae en "month").
 */
export function resolvePeriod(
  key: PeriodKey | string | undefined,
  today: ISODate,
  custom?: { from?: string | null; to?: string | null },
): ResolvedPeriod {
  switch (key) {
    case "today":
      return {
        key,
        label: "Hoy",
        from: today,
        to: today,
        previous: { from: addDays(today, -1), to: addDays(today, -1) },
      };
    case "week": {
      const from = startOfWeek(today);
      const to = endOfWeek(today);
      return { key, label: "Esta semana", from, to, previous: { from: addDays(from, -7), to: addDays(to, -7) } };
    }
    case "last-month": {
      const ref = addMonths(startOfMonth(today), -1);
      const from = startOfMonth(ref);
      const to = endOfMonth(ref);
      const prevRef = addMonths(ref, -1);
      const { year, month } = parseISO(ref);
      return {
        key,
        label: formatMonthYear(year, month),
        from,
        to,
        previous: { from: startOfMonth(prevRef), to: endOfMonth(prevRef) },
      };
    }
    case "custom": {
      if (custom && isISODate(custom.from) && isISODate(custom.to) && custom.from <= custom.to) {
        const from = custom.from;
        const to = custom.to;
        const length = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
        return {
          key,
          label: `${formatDateShort(from)} – ${formatDateShort(to)}`,
          from,
          to,
          previous: { from: addDays(from, -length), to: addDays(from, -1) },
        };
      }
      return resolvePeriod("month", today);
    }
    case "month":
    default: {
      const from = startOfMonth(today);
      const to = endOfMonth(today);
      const prevRef = addMonths(from, -1);
      const { year, month } = parseISO(today);
      return {
        key: "month",
        label: formatMonthYear(year, month),
        from,
        to,
        previous: { from: startOfMonth(prevRef), to: endOfMonth(prevRef) },
      };
    }
  }
}

/** Rango de un mes concreto. */
export function monthRange(year: number, month: number): DateRange {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  return { from, to: endOfMonth(from) };
}
