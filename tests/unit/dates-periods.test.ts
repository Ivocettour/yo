import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  endOfMonth,
  formatDateHuman,
  formatDateShort,
  formatMonthYear,
  isISODate,
  isValidTime,
  startOfWeek,
  endOfWeek,
  todayInTimezone,
  nowTimeInTimezone,
  fromDbDate,
  toDbDate,
  weekdayName,
} from "@/lib/utils/dates";
import { monthRange, resolvePeriod } from "@/lib/utils/periods";

describe("dates", () => {
  it("valida fechas ISO", () => {
    expect(isISODate("2026-09-18")).toBe(true);
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("18/09/2026")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
  });
  it("valida horas", () => {
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
  });
  it("suma dias y meses respetando fin de mes", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });
  it("calcula semanas de lunes a domingo", () => {
    // 2026-09-18 es viernes
    expect(weekdayName("2026-09-18")).toBe("viernes");
    expect(startOfWeek("2026-09-18")).toBe("2026-09-14");
    expect(endOfWeek("2026-09-18")).toBe("2026-09-20");
    expect(startOfWeek("2026-09-20")).toBe("2026-09-14"); // domingo
  });
  it("calcula hoy segun zona horaria", () => {
    // 02:30 UTC del 19/09 es 23:30 del 18/09 en Buenos Aires.
    const now = new Date("2026-09-19T02:30:00.000Z");
    expect(todayInTimezone("America/Argentina/Buenos_Aires", now)).toBe("2026-09-18");
    expect(todayInTimezone("UTC", now)).toBe("2026-09-19");
    expect(nowTimeInTimezone("America/Argentina/Buenos_Aires", now)).toBe("23:30");
    expect(todayInTimezone("Zona/Invalida", now)).toBe("2026-09-19");
  });
  it("convierte a y desde columnas @db.Date", () => {
    expect(fromDbDate(toDbDate("2026-09-18"))).toBe("2026-09-18");
  });
  it("formatea fechas en espanol", () => {
    expect(formatDateShort("2026-09-18")).toBe("18/09/2026");
    expect(formatMonthYear(2026, 9)).toBe("Septiembre 2026");
    expect(formatDateHuman("2026-09-18", { today: "2026-09-18" })).toBe("Hoy");
    expect(formatDateHuman("2026-09-17", { today: "2026-09-18" })).toBe("Ayer");
    expect(formatDateHuman("2026-09-10", { today: "2026-09-18" })).toBe("jue 10 sep");
    expect(formatDateHuman("2027-01-12", { today: "2026-09-18" })).toBe("mar 12 ene 2027");
    expect(formatDateHuman("2026-09-18", { long: true })).toBe("viernes 18 de septiembre de 2026");
  });
});

describe("periods", () => {
  const today = "2026-09-18";
  it("resuelve hoy", () => {
    const p = resolvePeriod("today", today);
    expect(p.from).toBe(today);
    expect(p.to).toBe(today);
    expect(p.previous).toEqual({ from: "2026-09-17", to: "2026-09-17" });
  });
  it("resuelve esta semana y la anterior", () => {
    const p = resolvePeriod("week", today);
    expect(p).toMatchObject({ from: "2026-09-14", to: "2026-09-20", previous: { from: "2026-09-07", to: "2026-09-13" } });
  });
  it("resuelve este mes y mes anterior", () => {
    const p = resolvePeriod("month", today);
    expect(p).toMatchObject({ from: "2026-09-01", to: "2026-09-30", previous: { from: "2026-08-01", to: "2026-08-31" }, label: "Septiembre 2026" });
    const lm = resolvePeriod("last-month", today);
    expect(lm).toMatchObject({ from: "2026-08-01", to: "2026-08-31", previous: { from: "2026-07-01", to: "2026-07-31" } });
  });
  it("resuelve personalizado y cae a mes si es invalido", () => {
    const p = resolvePeriod("custom", today, { from: "2026-09-01", to: "2026-09-10" });
    expect(p).toMatchObject({ from: "2026-09-01", to: "2026-09-10", previous: { from: "2026-08-22", to: "2026-08-31" } });
    expect(resolvePeriod("custom", today, { from: "2026-09-10", to: "2026-09-01" }).key).toBe("month");
    expect(resolvePeriod("lo-que-sea", today).key).toBe("month");
  });
  it("rango de mes", () => {
    expect(monthRange(2026, 2)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(endOfMonth("2024-02-10")).toBe("2024-02-29");
  });
});
