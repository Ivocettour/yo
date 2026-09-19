import { describe, expect, it } from "vitest";
import { expenseInputSchema, uberInputSchema } from "@/lib/validation/expense";
import { budgetSchema } from "@/lib/validation/budget";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/common";
import { parseFilters } from "@/lib/validation/filters";
import { expensesToCsv, parseBackupCsv, parseBackupJson, parseCsv, expenseDedupKey } from "@/lib/backup/format";

describe("validacion de gastos", () => {
  const base = { amount: "8.500", categoryId: "cat1", paymentMethodId: "pm1", date: "2026-09-18" };

  it("acepta un gasto valido y normaliza campos", () => {
    const r = expenseInputSchema.safeParse({ ...base, description: "  Uber  ", time: "", notes: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amount).toBe(8500);
      expect(r.data.description).toBe("Uber");
      expect(r.data.time).toBeNull();
      expect(r.data.notes).toBeNull();
      expect(r.data.installments).toBe(1);
    }
  });
  it("rechaza monto vacio, negativo o invalido", () => {
    for (const amount of ["", "-5", "0", "abc"]) {
      const r = expenseInputSchema.safeParse({ ...base, amount });
      expect(r.success).toBe(false);
      if (!r.success) expect(issuesToFieldErrors(r.error).amount).toBeTruthy();
    }
  });
  it("rechaza fecha y hora invalidas", () => {
    expect(expenseInputSchema.safeParse({ ...base, date: "18/09/2026" }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, date: "2026-02-30" }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, time: "25:00" }).success).toBe(false);
  });
  it("rechaza categoria vacia", () => {
    const r = expenseInputSchema.safeParse({ ...base, categoryId: "" });
    expect(r.success).toBe(false);
  });
  it("valida cuotas", () => {
    expect(expenseInputSchema.safeParse({ ...base, installments: "12", installmentNumber: "3" }).success).toBe(true);
    expect(expenseInputSchema.safeParse({ ...base, installments: "0" }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, installments: "61" }).success).toBe(false);
    const r = expenseInputSchema.safeParse({ ...base, installments: "3", installmentNumber: "5" });
    expect(r.success).toBe(false);
    if (!r.success) expect(issuesToFieldErrors(r.error).installmentNumber).toContain("cuota actual");
    const t = expenseInputSchema.safeParse({ ...base, installments: "3", amountIsTotal: "on" });
    expect(t.success && t.data.amountIsTotal).toBe(true);
  });
  it("valida el formulario de Uber", () => {
    const r = uberInputSchema.safeParse({ amount: "8500", paymentMethodId: "pm", date: "2026-09-18", origin: "Facultad", destination: "Casa" });
    expect(r.success).toBe(true);
    expect(uberInputSchema.safeParse({ amount: "8500", paymentMethodId: "", date: "2026-09-18" }).success).toBe(false);
  });
});

describe("validacion de presupuesto y auth", () => {
  it("presupuesto", () => {
    const r = budgetSchema.safeParse({ categoryId: "", amount: "500.000", month: "9", year: "2026" });
    expect(r.success && r.data).toMatchObject({ categoryId: null, amount: 500000, month: 9, year: 2026 });
    expect(budgetSchema.safeParse({ amount: "100", month: "13", year: "2026" }).success).toBe(false);
  });
  it("login y registro", () => {
    expect(loginSchema.safeParse({ email: "  A@B.com ", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "no-es-email", password: "x" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Yo", email: "a@b.com", password: "corta" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Yo", email: "a@b.com", password: "suficiente1" }).success).toBe(true);
  });
});

describe("filtros", () => {
  it("parsea searchParams ignorando valores invalidos", () => {
    const f = parseFilters({ from: "2026-09-01", to: "invalida", categoryId: "c1", minAmount: "1.000", maxAmount: "500", q: "  uber " });
    expect(f).toEqual({ from: "2026-09-01", to: undefined, categoryId: "c1", paymentMethodId: undefined, minAmount: 500, maxAmount: 1000, q: "uber" });
  });
  it("devuelve vacio sin params", () => {
    expect(parseFilters(undefined)).toEqual({});
  });
});

describe("backup", () => {
  const expense = {
    id: "abc123def456",
    amount: 8500,
    date: "2026-09-18",
    time: "10:30",
    description: 'Viaje "rápido", con coma',
    notes: null,
    origin: "Facultad",
    destination: "Casa",
    category: "Uber",
    categoryKey: "uber",
    paymentMethod: "Mercado Pago",
    paymentMethodKey: "mercadopago",
    installments: 1,
    installmentNumber: 1,
    installmentPlanId: null,
    createdAt: "2026-09-18T13:30:00.000Z",
  };

  it("exporta e importa CSV de ida y vuelta (con comillas y comas)", () => {
    const csv = expensesToCsv([expense]);
    expect(csv.startsWith("﻿id,fecha")).toBe(true);
    const parsed = parseBackupCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.expenses).toHaveLength(1);
    expect(parsed.expenses[0]).toMatchObject({ id: "abc123def456", amount: 8500, date: "2026-09-18", description: 'Viaje "rápido", con coma', category: "Uber", paymentMethod: "Mercado Pago" });
  });
  it("acepta CSV con punto y coma y fechas DD/MM/YYYY", () => {
    const csv = "fecha;monto;categoria;descripcion\n18/09/2026;8.500,50;Comida;Almuerzo\n";
    const parsed = parseBackupCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.expenses[0]).toMatchObject({ date: "2026-09-18", amount: 8500.5, category: "Comida", paymentMethod: "Otro" });
  });
  it("reporta filas invalidas sin abortar el resto", () => {
    const csv = "fecha,monto,categoria\n2026-09-18,100,Comida\n2026-99-99,100,Comida\n2026-09-19,-5,Comida\n";
    const parsed = parseBackupCsv(csv);
    expect(parsed.expenses).toHaveLength(1);
    expect(parsed.errors).toHaveLength(2);
  });
  it("rechaza CSV sin columnas obligatorias", () => {
    const parsed = parseBackupCsv("a,b\n1,2\n");
    expect(parsed.expenses).toHaveLength(0);
    expect(parsed.errors[0]).toContain("Falta la columna");
  });
  it("valida JSON completo y estructuras incorrectas", () => {
    const ok = parseBackupJson(JSON.stringify({ expenses: [expense], budgets: [{ category: null, amount: 1000, month: 9, year: 2026 }], categories: [{ name: "Uber", icon: "🚗", color: "#111827", active: true }] }));
    expect(ok.errors).toEqual([]);
    expect(ok.expenses).toHaveLength(1);
    expect(ok.budgets).toHaveLength(1);
    expect(ok.categories).toHaveLength(1);
    expect(parseBackupJson("{no json").errors[0]).toContain("JSON válido");
    expect(parseBackupJson(JSON.stringify({ foo: 1 })).errors[0]).toContain("expenses");
    const bad = parseBackupJson(JSON.stringify({ expenses: [{ amount: "abc", date: "2026-09-18", category: "X" }] }));
    expect(bad.expenses).toHaveLength(0);
    expect(bad.errors[0]).toContain("Gasto #1");
  });
  it("parser CSV maneja saltos de linea dentro de comillas", () => {
    expect(parseCsv('a,b\n"linea 1\nlinea 2",x\n')).toEqual([
      ["a", "b"],
      ["linea 1\nlinea 2", "x"],
    ]);
  });
  it("clave de deduplicacion es estable", () => {
    expect(expenseDedupKey({ date: "2026-09-18", amount: 8500, description: " Uber ", category: "UBER", time: null })).toBe(expenseDedupKey({ date: "2026-09-18", amount: 8500.0, description: "uber", category: "Uber", time: null }));
  });
});
