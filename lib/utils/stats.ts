import { addDays, addMonths, monthKey, parseISO, startOfMonth, weekKey, type ISODate } from "./dates";
import { round2 } from "./money";
import type { DateRange } from "./periods";

export const UBER_CATEGORY_KEY = "uber";

/** Representacion minima de un gasto para calculos de estadisticas. */
export interface ExpenseLite {
  id: string;
  amount: number;
  date: ISODate;
  time?: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryKey: string | null;
  paymentMethodId: string;
  paymentMethodName: string;
  description?: string | null;
}

export interface Summary {
  total: number;
  count: number;
  average: number;
  max: number;
  maxExpense: ExpenseLite | null;
}

export function summarize(expenses: ExpenseLite[]): Summary {
  let total = 0;
  let max = 0;
  let maxExpense: ExpenseLite | null = null;
  for (const e of expenses) {
    total += e.amount;
    if (e.amount > max || maxExpense === null) {
      max = e.amount;
      maxExpense = e;
    }
  }
  const count = expenses.length;
  return {
    total: round2(total),
    count,
    average: count ? round2(total / count) : 0,
    max: round2(max),
    maxExpense,
  };
}

export interface GroupTotal {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  total: number;
  count: number;
  percent: number;
}

export function groupByCategory(expenses: ExpenseLite[]): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    const g = map.get(e.categoryId) ?? {
      id: e.categoryId,
      name: e.categoryName,
      icon: e.categoryIcon,
      color: e.categoryColor,
      total: 0,
      count: 0,
      percent: 0,
    };
    g.total += e.amount;
    g.count += 1;
    map.set(e.categoryId, g);
  }
  return finishGroups(map, total);
}

export function groupByPaymentMethod(expenses: ExpenseLite[]): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    const g = map.get(e.paymentMethodId) ?? {
      id: e.paymentMethodId,
      name: e.paymentMethodName,
      total: 0,
      count: 0,
      percent: 0,
    };
    g.total += e.amount;
    g.count += 1;
    map.set(e.paymentMethodId, g);
  }
  return finishGroups(map, total);
}

function finishGroups(map: Map<string, GroupTotal>, total: number): GroupTotal[] {
  return [...map.values()]
    .map((g) => ({
      ...g,
      total: round2(g.total),
      percent: total > 0 ? round2((g.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface SeriesPoint {
  key: string; // fecha ISO, lunes de la semana o "YYYY-MM"
  total: number;
  count: number;
}

/** Serie diaria completa (incluye dias con 0) dentro del rango. */
export function seriesByDay(expenses: ExpenseLite[], range: DateRange): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    map.set(d, { key: d, total: 0, count: 0 });
  }
  for (const e of expenses) {
    const p = map.get(e.date);
    if (p) {
      p.total += e.amount;
      p.count += 1;
    }
  }
  return [...map.values()].map((p) => ({ ...p, total: round2(p.total) }));
}

/** Serie semanal (clave = lunes de cada semana) dentro del rango. */
export function seriesByWeek(expenses: ExpenseLite[], range: DateRange): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (let d = weekKey(range.from); d <= range.to; d = addDays(d, 7)) {
    map.set(d, { key: d, total: 0, count: 0 });
  }
  for (const e of expenses) {
    const k = weekKey(e.date);
    const p = map.get(k);
    if (p) {
      p.total += e.amount;
      p.count += 1;
    }
  }
  return [...map.values()].map((p) => ({ ...p, total: round2(p.total) }));
}

/** Serie mensual (clave "YYYY-MM") dentro del rango. */
export function seriesByMonth(expenses: ExpenseLite[], range: DateRange): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  const last = monthKey(range.to);
  for (let d = startOfMonth(range.from); monthKey(d) <= last; d = addMonths(d, 1)) {
    map.set(monthKey(d), { key: monthKey(d), total: 0, count: 0 });
  }
  for (const e of expenses) {
    const p = map.get(monthKey(e.date));
    if (p) {
      p.total += e.amount;
      p.count += 1;
    }
  }
  return [...map.values()].map((p) => ({ ...p, total: round2(p.total) }));
}

export interface Comparison {
  current: number;
  previous: number;
  diff: number;
  /** Variacion porcentual; null si no hay base para comparar. */
  percent: number | null;
}

export function compare(current: number, previous: number): Comparison {
  const diff = round2(current - previous);
  return {
    current: round2(current),
    previous: round2(previous),
    diff,
    percent: previous > 0 ? round2((diff / previous) * 100) : null,
  };
}

export function isUber(e: Pick<ExpenseLite, "categoryKey">): boolean {
  return e.categoryKey === UBER_CATEGORY_KEY;
}

export interface UberStats extends Summary {
  /** Porcentaje del gasto total del periodo. */
  percentOfTotal: number;
  tripsPerDay: number;
}

export function uberStats(expenses: ExpenseLite[], range?: DateRange): UberStats {
  const total = summarize(expenses).total;
  const trips = expenses.filter(isUber);
  const s = summarize(trips);
  const days = range ? Math.max(1, Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000) + 1) : 1;
  return {
    ...s,
    percentOfTotal: total > 0 ? round2((s.total / total) * 100) : 0,
    tripsPerDay: round2(s.count / days),
  };
}

/** Promedio diario considerando los dias transcurridos del rango hasta `today` (inclusive). */
export function dailyAverage(total: number, range: DateRange, today: ISODate): number {
  const end = today < range.to ? today : range.to;
  if (end < range.from) return 0;
  const days = Math.round((Date.parse(end) - Date.parse(range.from)) / 86_400_000) + 1;
  return days > 0 ? round2(total / days) : 0;
}

/** Totales por dia como mapa fecha -> total (para el calendario). */
export function totalsByDate(expenses: ExpenseLite[]): Map<ISODate, { total: number; count: number }> {
  const map = new Map<ISODate, { total: number; count: number }>();
  for (const e of expenses) {
    const p = map.get(e.date) ?? { total: 0, count: 0 };
    p.total = round2(p.total + e.amount);
    p.count += 1;
    map.set(e.date, p);
  }
  return map;
}

/** Nivel de intensidad 0..4 relativo al maximo (para el calendario). */
export function intensityLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const r = value / max;
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

/** Etiqueta corta para el eje X segun granularidad. */
export function seriesLabel(key: string, granularity: "day" | "week" | "month"): string {
  if (granularity === "month") {
    const [y, m] = key.split("-").map(Number);
    const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${names[m - 1]} ${String(y).slice(2)}`;
  }
  const { day, month } = parseISO(key);
  return `${day}/${month}`;
}
