import { describe, expect, it } from "vitest";
import {
  compare,
  dailyAverage,
  groupByCategory,
  groupByPaymentMethod,
  intensityLevel,
  seriesByDay,
  seriesByMonth,
  seriesByWeek,
  summarize,
  totalsByDate,
  uberStats,
  type ExpenseLite,
} from "@/lib/utils/stats";

function e(partial: Partial<ExpenseLite> & { amount: number; date: string }): ExpenseLite {
  return {
    id: Math.random().toString(36).slice(2),
    categoryId: "food",
    categoryName: "Comida",
    categoryIcon: "🍔",
    categoryColor: "#f97316",
    categoryKey: "food",
    paymentMethodId: "cash",
    paymentMethodName: "Efectivo",
    ...partial,
  };
}

const uber = (amount: number, date: string) =>
  e({ amount, date, categoryId: "uber", categoryName: "Uber", categoryKey: "uber", paymentMethodId: "mp", paymentMethodName: "Mercado Pago" });

const sample: ExpenseLite[] = [
  uber(8500, "2026-09-01"),
  uber(6000, "2026-09-02"),
  e({ amount: 12000, date: "2026-09-02" }),
  e({ amount: 3500, date: "2026-09-10", paymentMethodId: "debit", paymentMethodName: "Débito" }),
  uber(5500, "2026-09-18"),
];

describe("summarize", () => {
  it("calcula total, cantidad, promedio y maximo", () => {
    const s = summarize(sample);
    expect(s.total).toBe(35500);
    expect(s.count).toBe(5);
    expect(s.average).toBe(7100);
    expect(s.max).toBe(12000);
    expect(s.maxExpense?.amount).toBe(12000);
  });
  it("maneja lista vacia", () => {
    expect(summarize([])).toMatchObject({ total: 0, count: 0, average: 0, max: 0, maxExpense: null });
  });
});

describe("agrupaciones", () => {
  it("agrupa por categoria con porcentajes ordenados", () => {
    const g = groupByCategory(sample);
    expect(g[0]).toMatchObject({ id: "uber", total: 20000, count: 3, percent: 56.34 });
    expect(g[1]).toMatchObject({ id: "food", total: 15500, count: 2, percent: 43.66 });
  });
  it("agrupa por metodo de pago", () => {
    const g = groupByPaymentMethod(sample);
    expect(g.map((x) => x.id)).toEqual(["mp", "cash", "debit"]);
    expect(g.find((x) => x.id === "debit")?.total).toBe(3500);
  });
});

describe("series", () => {
  const range = { from: "2026-09-01", to: "2026-09-30" };
  it("serie diaria completa con ceros", () => {
    const s = seriesByDay(sample, range);
    expect(s).toHaveLength(30);
    expect(s[0]).toEqual({ key: "2026-09-01", total: 8500, count: 1 });
    expect(s[1]).toEqual({ key: "2026-09-02", total: 18000, count: 2 });
    expect(s[2].total).toBe(0);
  });
  it("serie semanal por lunes", () => {
    const s = seriesByWeek(sample, range);
    expect(s[0].key).toBe("2026-08-31");
    expect(s[0].total).toBe(26500);
    expect(s.find((p) => p.key === "2026-09-14")?.total).toBe(5500);
  });
  it("serie mensual", () => {
    const s = seriesByMonth(sample, { from: "2026-07-01", to: "2026-09-30" });
    expect(s.map((p) => p.key)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(s[2].total).toBe(35500);
  });
});

describe("comparaciones y Uber", () => {
  it("compara periodos", () => {
    expect(compare(125000, 110000)).toEqual({ current: 125000, previous: 110000, diff: 15000, percent: 13.64 });
    expect(compare(100, 0).percent).toBeNull();
  });
  it("estadisticas de Uber", () => {
    const u = uberStats(sample, { from: "2026-09-01", to: "2026-09-30" });
    expect(u.total).toBe(20000);
    expect(u.count).toBe(3);
    expect(u.average).toBe(6666.67);
    expect(u.percentOfTotal).toBe(56.34);
    expect(u.tripsPerDay).toBe(0.1);
  });
  it("promedio diario considera dias transcurridos", () => {
    expect(dailyAverage(35500, { from: "2026-09-01", to: "2026-09-30" }, "2026-09-18")).toBe(1972.22);
    expect(dailyAverage(35500, { from: "2026-08-01", to: "2026-08-31" }, "2026-09-18")).toBe(1145.16);
    expect(dailyAverage(100, { from: "2026-10-01", to: "2026-10-31" }, "2026-09-18")).toBe(0);
  });
  it("totales por fecha e intensidad", () => {
    const m = totalsByDate(sample);
    expect(m.get("2026-09-02")).toEqual({ total: 18000, count: 2 });
    expect(intensityLevel(0, 100)).toBe(0);
    expect(intensityLevel(10, 100)).toBe(1);
    expect(intensityLevel(100, 100)).toBe(4);
  });
});
