/**
 * Tests de integracion contra PostgreSQL (DATABASE_URL de .env).
 * Crean usuarios de prueba propios y los eliminan al terminar (cascade).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createUserWithDefaults } from "@/lib/auth/bootstrap";
import { hashToken } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getExpenseById, getExpensesLite, getFilteredTotals, listExpenses } from "@/lib/queries/expenses";
import { getDashboardData, getMonthHistory, getCalendarData, getStatsData } from "@/lib/queries/dashboard";
import { getBudgetProgress, getInstallmentPlans } from "@/lib/queries/budgets";
import { buildBackup, importBackup } from "@/lib/backup/service";
import { parseBackupJson } from "@/lib/backup/format";
import { toDbDate, todayInTimezone, addMonths, startOfMonth, parseISO } from "@/lib/utils/dates";
import { splitInstallments } from "@/lib/utils/money";

const TZ = "America/Argentina/Buenos_Aires";
const stamp = Date.now();
let userA: { id: string; email: string };
let userB: { id: string; email: string };
let catA: Record<string, string>;
let pmA: Record<string, string>;
const today = todayInTimezone(TZ);
const { year, month } = parseISO(today);
const thisMonthStart = startOfMonth(today);
const prevMonthDay = addMonths(thisMonthStart, -1).replace(/-01$/, "-10");

beforeAll(async () => {
  userA = await createUserWithDefaults({ email: `test-a-${stamp}@test.local`, name: "A", password: "password123" });
  userB = await createUserWithDefaults({ email: `test-b-${stamp}@test.local`, name: "B", password: "password123" });
  const cats = await prisma.category.findMany({ where: { userId: userA.id } });
  const pms = await prisma.paymentMethod.findMany({ where: { userId: userA.id } });
  catA = Object.fromEntries(cats.map((c) => [c.key!, c.id]));
  pmA = Object.fromEntries(pms.map((m) => [m.key!, m.id]));
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@test.local` } } });
  await prisma.$disconnect();
});

describe("usuario y sesion", () => {
  it("crea el usuario con categorias y metodos por defecto y password hasheada", async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userA.id }, include: { categories: true, paymentMethods: true } });
    expect(u.categories.map((c) => c.name)).toContain("Uber");
    expect(u.categories).toHaveLength(12);
    expect(u.paymentMethods).toHaveLength(6);
    expect(u.passwordHash).not.toBe("password123");
    expect(await verifyPassword("password123", u.passwordHash)).toBe(true);
    expect(await verifyPassword("otra", u.passwordHash)).toBe(false);
  });
  it("el hash de token es determinista y no reversible", () => {
    const h = hashToken("a".repeat(64));
    expect(h).toHaveLength(64);
    expect(h).toBe(hashToken("a".repeat(64)));
    expect(h).not.toBe(hashToken("b".repeat(64)));
  });
});

describe("CRUD de gastos y persistencia", () => {
  let expenseId: string;

  it("crea un gasto y lo persiste", async () => {
    const created = await prisma.expense.create({
      data: { userId: userA.id, categoryId: catA.uber, paymentMethodId: pmA.mercadopago, amount: 8500, date: toDbDate(today), time: "10:30", description: "Facultad → Casa", origin: "Facultad", destination: "Casa" },
    });
    expenseId = created.id;
    const read = await getExpenseById(userA.id, expenseId);
    expect(read).toMatchObject({ amount: 8500, date: today, time: "10:30", description: "Facultad → Casa", category: { name: "Uber", key: "uber" }, paymentMethod: { name: "Mercado Pago" } });
  });

  it("edita el gasto", async () => {
    await prisma.expense.update({ where: { id: expenseId }, data: { amount: 9200, description: "Editado" } });
    const read = await getExpenseById(userA.id, expenseId);
    expect(read?.amount).toBe(9200);
    expect(read?.description).toBe("Editado");
  });

  it("autorizacion: otro usuario no ve ni lista el gasto", async () => {
    expect(await getExpenseById(userB.id, expenseId)).toBeNull();
    const list = await listExpenses(userB.id, {});
    expect(list.total).toBe(0);
    const totals = await getFilteredTotals(userB.id, {});
    expect(totals.total).toBe(0);
  });

  it("elimina el gasto", async () => {
    await prisma.expense.delete({ where: { id: expenseId } });
    expect(await getExpenseById(userA.id, expenseId)).toBeNull();
  });
});

describe("filtros, busqueda y totales", () => {
  beforeAll(async () => {
    await prisma.expense.createMany({
      data: [
        { userId: userA.id, categoryId: catA.uber, paymentMethodId: pmA.mercadopago, amount: 8500, date: toDbDate(today), description: "Uber a casa", time: "20:00" },
        { userId: userA.id, categoryId: catA.uber, paymentMethodId: pmA.credit, amount: 6000, date: toDbDate(today), description: "Uber a la facu", time: "08:00" },
        { userId: userA.id, categoryId: catA.food, paymentMethodId: pmA.cash, amount: 12000, date: toDbDate(today), description: "Almuerzo", notes: "con amigos" },
        { userId: userA.id, categoryId: catA.food, paymentMethodId: pmA.debit, amount: 3500, date: toDbDate(prevMonthDay), description: "Café" },
        { userId: userB.id, categoryId: (await prisma.category.findFirstOrThrow({ where: { userId: userB.id, key: "uber" } })).id, paymentMethodId: (await prisma.paymentMethod.findFirstOrThrow({ where: { userId: userB.id } })).id, amount: 99999, date: toDbDate(today), description: "Uber de B" },
      ],
    });
  });

  it("lista del mas reciente al mas antiguo y solo del usuario", async () => {
    const page = await listExpenses(userA.id, {});
    expect(page.total).toBe(4);
    expect(page.items.map((e) => e.description)).toEqual(["Uber a casa", "Uber a la facu", "Almuerzo", "Café"]);
    expect(page.items.every((e) => e.amount !== 99999)).toBe(true);
    expect(page.nextPage).toBeNull();
  });

  it("filtra por categoria, metodo, fechas y rango de monto", async () => {
    expect((await listExpenses(userA.id, { categoryId: catA.uber })).total).toBe(2);
    expect((await listExpenses(userA.id, { paymentMethodId: pmA.cash })).total).toBe(1);
    expect((await listExpenses(userA.id, { from: thisMonthStart, to: today })).total).toBe(3);
    expect((await listExpenses(userA.id, { minAmount: 6000, maxAmount: 9000 })).total).toBe(2);
    // Categoria de otro usuario no filtra nada raro.
    const catB = await prisma.category.findFirstOrThrow({ where: { userId: userB.id, key: "uber" } });
    expect((await listExpenses(userA.id, { categoryId: catB.id })).total).toBe(0);
  });

  it("busca por descripcion, notas, categoria y metodo (junto con filtros)", async () => {
    expect((await listExpenses(userA.id, { q: "uber" })).total).toBe(2);
    expect((await listExpenses(userA.id, { q: "amigos" })).total).toBe(1);
    expect((await listExpenses(userA.id, { q: "comida" })).total).toBe(2);
    expect((await listExpenses(userA.id, { q: "mercado" })).total).toBe(1);
    expect((await listExpenses(userA.id, { q: "uber", paymentMethodId: pmA.credit })).total).toBe(1);
  });

  it("totales filtrados coinciden con la lista", async () => {
    const t = await getFilteredTotals(userA.id, { from: thisMonthStart, to: today });
    expect(t).toEqual({ total: 26500, count: 3, average: 8833.33, max: 12000 });
  });

  it("pagina con tamano configurable", async () => {
    const p0 = await listExpenses(userA.id, {}, 0, 3);
    expect(p0.items).toHaveLength(3);
    expect(p0.nextPage).toBe(1);
    const p1 = await listExpenses(userA.id, {}, 1, 3);
    expect(p1.items).toHaveLength(1);
    expect(p1.nextPage).toBeNull();
  });
});

describe("estadisticas y dashboard", () => {
  it("dashboard del mes con Uber y comparacion contra mes anterior", async () => {
    const d = await getDashboardData(userA.id, TZ, "month");
    expect(d.summary.total).toBe(26500);
    expect(d.summary.count).toBe(3);
    expect(d.summary.max).toBe(12000);
    expect(d.uber.total).toBe(14500);
    expect(d.uber.count).toBe(2);
    expect(d.uber.average).toBe(7250);
    expect(d.uber.percentOfTotal).toBe(54.72);
    expect(d.monthComparison.current).toBe(26500);
    expect(d.monthComparison.previous).toBe(3500);
    expect(d.monthComparison.comparison.diff).toBe(23000);
    expect(d.monthComparison.comparison.percent).toBe(657.14);
    expect(d.byCategory[0]).toMatchObject({ name: "Uber", total: 14500 });
    expect(d.recent[0].description).toBe("Uber a casa");
  });

  it("estadisticas: categorias, metodos de pago y evolucion", async () => {
    const s = await getStatsData(userA.id, TZ, { periodKey: "month", granularity: "day" });
    expect(s.byCategory.map((c) => c.total)).toEqual([14500, 12000]);
    expect(s.byPaymentMethod.reduce((a, m) => a + m.total, 0)).toBe(26500);
    expect(s.evolution.find((p) => p.key === today)?.total).toBe(26500);
    expect(s.uber.count).toBe(2);
    expect(s.uberByMonth.at(-1)?.total).toBe(14500);
    const m = await getStatsData(userA.id, TZ, { periodKey: "month", granularity: "month" });
    expect(m.granularity).toBe("month");
    expect(m.evolution.at(-1)?.total).toBe(26500);
  });

  it("historial mensual y calendario", async () => {
    const h = await getMonthHistory(userA.id, TZ, year, month);
    expect(h.summary.total).toBe(26500);
    expect(h.topCategory?.name).toBe("Uber");
    expect(h.uber.total).toBe(14500);
    expect(h.previousMonths[0].total).toBe(3500);
    expect(h.monthsWithData).toContain(today.slice(0, 7));
    const c = await getCalendarData(userA.id, year, month);
    expect(c.days.get(today)).toEqual({ total: 26500, count: 3 });
    expect(c.max).toBe(26500);
  });

  it("los gastos lite estan aislados por usuario", async () => {
    const lite = await getExpensesLite(userB.id, { from: thisMonthStart, to: today });
    expect(lite).toHaveLength(1);
    expect(lite[0].amount).toBe(99999);
  });
});

describe("presupuestos", () => {
  it("calcula progreso general y por categoria con advertencias", async () => {
    await prisma.budget.createMany({
      data: [
        { userId: userA.id, categoryId: null, amount: 50000, year, month },
        { userId: userA.id, categoryId: catA.uber, amount: 10000, year, month },
        { userId: userA.id, categoryId: catA.food, amount: 14000, year, month },
      ],
    });
    const p = await getBudgetProgress(userA.id, year, month);
    expect(p.general).toMatchObject({ amount: 50000, spent: 26500, remaining: 23500, percent: 53, exceeded: false, warning: false });
    const uber = p.categories.find((c) => c.categoryId === catA.uber)!;
    expect(uber).toMatchObject({ spent: 14500, remaining: -4500, exceeded: true, percent: 145 });
    const food = p.categories.find((c) => c.categoryId === catA.food)!;
    expect(food).toMatchObject({ spent: 12000, exceeded: false, warning: true, percent: 85.71 });
    // El usuario B no tiene presupuestos.
    const pb = await getBudgetProgress(userB.id, year, month);
    expect(pb.general).toBeNull();
    expect(pb.categories).toHaveLength(0);
  });
});

describe("cuotas", () => {
  it("una compra en cuotas genera un gasto por mes sin duplicar el total", async () => {
    const total = 120000;
    const n = 12;
    const amounts = splitInstallments(total, n);
    const plan = await prisma.installmentPlan.create({
      data: { userId: userA.id, categoryId: catA.shopping, paymentMethodId: pmA.credit, description: "Notebook", totalAmount: total, installments: n, startDate: toDbDate(today) },
    });
    await prisma.expense.createMany({
      data: amounts.map((amount, i) => ({ userId: userA.id, categoryId: catA.shopping, paymentMethodId: pmA.credit, amount, date: toDbDate(addMonths(today, i)), description: "Notebook", installments: n, installmentNumber: i + 1, installmentPlanId: plan.id })),
    });
    const d = await getDashboardData(userA.id, TZ, "month");
    expect(d.summary.total).toBe(26500 + 10000); // solo la primera cuota impacta este mes
    const plans = await getInstallmentPlans(userA.id, today);
    expect(plans[0]).toMatchObject({ installments: 12, installmentAmount: 10000, paid: 1, remaining: 11, remainingAmount: 110000, finished: false });
    // Borrar el plan elimina todas las cuotas.
    await prisma.installmentPlan.delete({ where: { id: plan.id } });
    expect(await prisma.expense.count({ where: { installmentPlanId: plan.id } })).toBe(0);
  });
});

describe("backup: exportar e importar", () => {
  it("exporta solo los datos del usuario", async () => {
    const b = await buildBackup(userA.id);
    expect(b.expenses.length).toBe(4);
    expect(b.expenses.every((e) => e.amount !== 99999)).toBe(true);
    expect(b.budgets.length).toBe(3);
    expect(b.categories.some((c) => c.key === "uber")).toBe(true);
  });

  it("importa en otro usuario sin tocar al original y evita duplicados", async () => {
    const b = await buildBackup(userA.id);
    const parsed = parseBackupJson(JSON.stringify(b));
    expect(parsed.errors).toEqual([]);
    // Agregamos una categoria nueva para verificar que se crea.
    parsed.expenses.push({ ...parsed.expenses[0], id: null, category: "Mascotas", categoryKey: null, description: "Veterinaria", amount: 5000 });

    const first = await importBackup(userB.id, parsed);
    expect(first.imported).toBe(5);
    expect(first.skipped).toBe(0);
    expect(first.categoriesCreated).toBe(1);
    expect(first.budgetsUpserted).toBe(3);

    const listB = await listExpenses(userB.id, {});
    expect(listB.total).toBe(6); // 1 propio + 5 importados
    expect(await prisma.category.count({ where: { userId: userB.id, name: "Mascotas" } })).toBe(1);

    // Segunda importacion identica: todo se omite.
    const second = await importBackup(userB.id, parsed);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(5);
    expect((await listExpenses(userB.id, {})).total).toBe(6);

    // El usuario A no cambio.
    expect((await listExpenses(userA.id, {})).total).toBe(4);
    expect(await prisma.category.count({ where: { userId: userA.id, name: "Mascotas" } })).toBe(0);
  });
});
