import "server-only";
import { prisma } from "@/lib/db";
import { addMonths, monthKey, parseISO, startOfMonth, todayInTimezone, type ISODate } from "@/lib/utils/dates";
import { round2 } from "@/lib/utils/money";
import { monthRange, resolvePeriod, type DateRange, type ResolvedPeriod } from "@/lib/utils/periods";
import {
  compare,
  dailyAverage,
  groupByCategory,
  groupByPaymentMethod,
  seriesByDay,
  seriesByMonth,
  seriesByWeek,
  summarize,
  uberStats,
  isUber,
  type Comparison,
  type ExpenseLite,
  type GroupTotal,
  type SeriesPoint,
  type Summary,
  type UberStats,
} from "@/lib/utils/stats";
import { getExpensesLite, type ExpenseFilters } from "./expenses";
import { getBudgetProgress, type BudgetProgress } from "./budgets";

export interface DashboardData {
  today: ISODate;
  period: ResolvedPeriod;
  summary: Summary;
  comparison: Comparison;
  uber: UberStats;
  uberPrevious: UberStats;
  uberSeries: SeriesPoint[];
  monthComparison: { current: number; previous: number; comparison: Comparison; currentLabel: ISODate; previousLabel: ISODate };
  byCategory: GroupTotal[];
  recent: ExpenseLite[];
  budgets: BudgetProgress;
  dailyAverage: number;
}

export async function getDashboardData(
  userId: string,
  timezone: string,
  periodKey?: string,
  custom?: { from?: string | null; to?: string | null },
): Promise<DashboardData> {
  const today = todayInTimezone(timezone);
  const period = resolvePeriod(periodKey, today, custom);
  const { year, month } = parseISO(today);
  const thisMonth = monthRange(year, month);
  const prevMonthStart = addMonths(startOfMonth(today), -1);
  const prevMonth = monthRange(parseISO(prevMonthStart).year, parseISO(prevMonthStart).month);

  // Rango amplio: cubre el periodo actual, el anterior, este mes y el anterior. Una sola consulta.
  const wideFrom = [period.from, period.previous.from, prevMonth.from].sort()[0];
  const wideTo = [period.to, period.previous.to, thisMonth.to].sort().at(-1)!;
  const [all, budgets] = await Promise.all([
    getExpensesLite(userId, { from: wideFrom, to: wideTo }),
    getBudgetProgress(userId, year, month),
  ]);

  const inRange = (r: DateRange) => all.filter((e) => e.date >= r.from && e.date <= r.to);
  const current = inRange(period);
  const previous = inRange(period.previous);
  const currentMonthExpenses = inRange(thisMonth);
  const previousMonthExpenses = inRange(prevMonth);

  const summary = summarize(current);
  const prevSummary = summarize(previous);
  const uber = uberStats(current, period);
  const uberPrevious = uberStats(previous, period.previous);
  const uberTrips = current.filter(isUber);
  const days = Math.round((Date.parse(period.to) - Date.parse(period.from)) / 86_400_000) + 1;
  const uberSeries = days <= 31 ? seriesByDay(uberTrips, period) : days <= 120 ? seriesByWeek(uberTrips, period) : seriesByMonth(uberTrips, period);

  const monthTotal = summarize(currentMonthExpenses).total;
  const prevMonthTotal = summarize(previousMonthExpenses).total;

  const recent = [...current]
    .sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")))
    .slice(0, 5);

  return {
    today,
    period,
    summary,
    comparison: compare(summary.total, prevSummary.total),
    uber,
    uberPrevious,
    uberSeries,
    monthComparison: {
      current: monthTotal,
      previous: prevMonthTotal,
      comparison: compare(monthTotal, prevMonthTotal),
      currentLabel: thisMonth.from,
      previousLabel: prevMonth.from,
    },
    byCategory: groupByCategory(current).slice(0, 5),
    recent,
    budgets,
    dailyAverage: dailyAverage(summary.total, period, today),
  };
}

export type Granularity = "day" | "week" | "month";

export interface StatsData {
  today: ISODate;
  period: ResolvedPeriod;
  summary: Summary;
  byCategory: GroupTotal[];
  byPaymentMethod: GroupTotal[];
  evolution: SeriesPoint[];
  granularity: Granularity;
  uber: UberStats;
  uberByMonth: SeriesPoint[];
  uberByDay: SeriesPoint[];
  uberByWeekday: { day: number; label: string; total: number; count: number }[];
  filteredCount: number;
}

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export async function getStatsData(
  userId: string,
  timezone: string,
  options: {
    periodKey?: string;
    custom?: { from?: string | null; to?: string | null };
    granularity?: string;
    filters?: ExpenseFilters;
  } = {},
): Promise<StatsData> {
  const today = todayInTimezone(timezone);
  const period = resolvePeriod(options.periodKey, today, options.custom);
  const granularity: Granularity =
    options.granularity === "week" || options.granularity === "month" ? options.granularity : "day";

  // Para la evolucion mensual de Uber miramos los ultimos 6 meses independientemente del periodo.
  const sixMonthsAgo = startOfMonth(addMonths(today, -5));
  const wideFrom = [period.from, sixMonthsAgo].sort()[0];
  const wideTo = [period.to, today].sort().at(-1)!;
  const all = await getExpensesLite(userId, { from: wideFrom, to: wideTo }, options.filters);
  const current = all.filter((e) => e.date >= period.from && e.date <= period.to);

  // Para diario/semanal no mostramos dias futuros del periodo (quedarian en 0).
  const evolutionRange: DateRange =
    granularity === "month"
      ? { from: [sixMonthsAgo, period.from].sort()[0], to: period.to }
      : { from: period.from, to: period.to > today && period.from <= today ? today : period.to };
  const evolutionSource = granularity === "month" ? all.filter((e) => e.date >= evolutionRange.from && e.date <= evolutionRange.to) : current;
  const evolution =
    granularity === "day"
      ? seriesByDay(evolutionSource, evolutionRange)
      : granularity === "week"
        ? seriesByWeek(evolutionSource, evolutionRange)
        : seriesByMonth(evolutionSource, evolutionRange);

  const uberAll = all.filter(isUber);
  const uberCurrent = current.filter(isUber);
  const uberByWeekdayMap = new Map<number, { total: number; count: number }>();
  for (const e of uberCurrent) {
    const dow = new Date(`${e.date}T00:00:00Z`).getUTCDay();
    const p = uberByWeekdayMap.get(dow) ?? { total: 0, count: 0 };
    p.total = round2(p.total + e.amount);
    p.count += 1;
    uberByWeekdayMap.set(dow, p);
  }
  const uberByWeekday = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    day: d,
    label: WEEKDAY_LABELS[d],
    total: uberByWeekdayMap.get(d)?.total ?? 0,
    count: uberByWeekdayMap.get(d)?.count ?? 0,
  }));

  return {
    today,
    period,
    summary: summarize(current),
    byCategory: groupByCategory(current),
    byPaymentMethod: groupByPaymentMethod(current),
    evolution,
    granularity,
    uber: uberStats(current, period),
    uberByMonth: seriesByMonth(uberAll, { from: sixMonthsAgo, to: wideTo }),
    uberByDay: seriesByDay(uberCurrent, period),
    uberByWeekday,
    filteredCount: current.length,
  };
}

export interface MonthHistory {
  year: number;
  month: number;
  range: DateRange;
  summary: Summary;
  dailyAverage: number;
  topCategory: GroupTotal | null;
  byCategory: GroupTotal[];
  uber: UberStats;
  previousMonths: { key: string; label: ISODate; total: number; count: number; comparison: Comparison }[];
  monthsWithData: string[];
}

/** Historial de un mes concreto con comparacion contra los 3 meses anteriores. */
export async function getMonthHistory(userId: string, timezone: string, year: number, month: number): Promise<MonthHistory> {
  const today = todayInTimezone(timezone);
  const range = monthRange(year, month);
  const from = addMonths(range.from, -3);
  const [all, monthsWithData] = await Promise.all([
    getExpensesLite(userId, { from, to: range.to }),
    getMonthsWithData(userId),
  ]);
  const current = all.filter((e) => e.date >= range.from);
  const summary = summarize(current);
  const byCategory = groupByCategory(current);
  const previousMonths: MonthHistory["previousMonths"] = [];
  for (let i = 1; i <= 3; i++) {
    const start = addMonths(range.from, -i);
    const key = monthKey(start);
    const rows = all.filter((e) => monthKey(e.date) === key);
    const s = summarize(rows);
    previousMonths.push({ key, label: start, total: s.total, count: s.count, comparison: compare(summary.total, s.total) });
  }
  return {
    year,
    month,
    range,
    summary,
    dailyAverage: dailyAverage(summary.total, range, today),
    topCategory: byCategory[0] ?? null,
    byCategory,
    uber: uberStats(current, range),
    previousMonths,
    monthsWithData,
  };
}

/** Lista de meses "YYYY-MM" con al menos un gasto, del mas reciente al mas antiguo. */
export async function getMonthsWithData(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ ym: string }[]>`
    SELECT DISTINCT to_char("date", 'YYYY-MM') AS ym
    FROM "Expense"
    WHERE "userId" = ${userId}
    ORDER BY ym DESC
  `;
  return rows.map((r) => r.ym);
}

export interface CalendarData {
  year: number;
  month: number;
  days: Map<ISODate, { total: number; count: number }>;
  max: number;
  total: number;
}

export async function getCalendarData(userId: string, year: number, month: number): Promise<CalendarData> {
  const range = monthRange(year, month);
  const rows = await getExpensesLite(userId, range);
  const days = new Map<ISODate, { total: number; count: number }>();
  let max = 0;
  let total = 0;
  for (const e of rows) {
    const p = days.get(e.date) ?? { total: 0, count: 0 };
    p.total = round2(p.total + e.amount);
    p.count += 1;
    days.set(e.date, p);
    total = round2(total + e.amount);
    if (p.total > max) max = p.total;
  }
  return { year, month, days, max, total };
}

export type { ExpenseLite };
