import "server-only";
import { prisma } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/utils/dates";
import { round2 } from "@/lib/utils/money";
import { monthRange } from "@/lib/utils/periods";

export interface BudgetDTO {
  id: string;
  categoryId: string | null;
  amount: number;
  month: number;
  year: number;
}

export interface BudgetItemProgress {
  budgetId: string | null;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  percent: number;
  exceeded: boolean;
  /** Advertencia cuando se supera el 80%. */
  warning: boolean;
}

export interface BudgetProgress {
  year: number;
  month: number;
  general: BudgetItemProgress | null;
  categories: BudgetItemProgress[];
  /** Categorias activas sin presupuesto (para ofrecer crear). */
  totalSpent: number;
}

function toItem(
  budget: { id: string | null; categoryId: string | null; amount: number },
  spent: number,
  cat: { name: string; icon: string; color: string },
): BudgetItemProgress {
  const remaining = round2(budget.amount - spent);
  const percent = budget.amount > 0 ? round2((spent / budget.amount) * 100) : 0;
  return {
    budgetId: budget.id,
    categoryId: budget.categoryId,
    categoryName: cat.name,
    categoryIcon: cat.icon,
    categoryColor: cat.color,
    amount: budget.amount,
    spent: round2(spent),
    remaining,
    percent,
    exceeded: spent > budget.amount,
    warning: percent >= 80 && spent <= budget.amount,
  };
}

/** Presupuestos del mes con el gasto real acumulado. */
export async function getBudgetProgress(userId: string, year: number, month: number): Promise<BudgetProgress> {
  const range = monthRange(year, month);
  const [budgets, grouped, categories] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, year, month },
      select: { id: true, categoryId: true, amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, date: { gte: toDbDate(range.from), lte: toDbDate(range.to) } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, icon: true, color: true, active: true },
    }),
  ]);
  const spentByCategory = new Map(grouped.map((g) => [g.categoryId, round2(Number(g._sum.amount ?? 0))]));
  const totalSpent = round2([...spentByCategory.values()].reduce((a, b) => a + b, 0));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const generalBudget = budgets.find((b) => b.categoryId === null);
  const general = generalBudget
    ? toItem({ id: generalBudget.id, categoryId: null, amount: Number(generalBudget.amount) }, totalSpent, {
        name: "Presupuesto general",
        icon: "🎯",
        color: "#6366f1",
      })
    : null;

  const categoryItems = budgets
    .filter((b) => b.categoryId !== null)
    .map((b) => {
      const cat = catMap.get(b.categoryId!) ?? { name: "Categoría", icon: "🏷️", color: "#64748b" };
      return toItem({ id: b.id, categoryId: b.categoryId, amount: Number(b.amount) }, spentByCategory.get(b.categoryId!) ?? 0, cat);
    })
    .sort((a, b) => b.percent - a.percent);

  return { year, month, general, categories: categoryItems, totalSpent };
}

export async function getBudgets(userId: string, year: number, month: number): Promise<BudgetDTO[]> {
  const rows = await prisma.budget.findMany({ where: { userId, year, month } });
  return rows.map((b) => ({ id: b.id, categoryId: b.categoryId, amount: round2(Number(b.amount)), month: b.month, year: b.year }));
}

export interface InstallmentPlanDTO {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  startDate: string;
  categoryName: string;
  categoryIcon: string;
  paymentMethodName: string;
  installmentAmount: number;
  paid: number;
  remaining: number;
  paidAmount: number;
  remainingAmount: number;
  nextDate: string | null;
  finished: boolean;
}

/** Planes de cuotas del usuario con progreso (pagadas = cuotas con fecha <= hoy). */
export async function getInstallmentPlans(userId: string, today: string): Promise<InstallmentPlanDTO[]> {
  const plans = await prisma.installmentPlan.findMany({
    where: { userId },
    include: {
      category: { select: { name: true, icon: true } },
      paymentMethod: { select: { name: true } },
      expenses: { select: { amount: true, date: true, installmentNumber: true }, orderBy: { installmentNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return plans.map((p) => {
    const todayDate = toDbDate(today);
    const paidRows = p.expenses.filter((e) => e.date <= todayDate);
    const paidAmount = round2(paidRows.reduce((a, e) => a + Number(e.amount), 0));
    const totalAmount = round2(Number(p.totalAmount));
    const next = p.expenses.find((e) => e.date > todayDate);
    return {
      id: p.id,
      description: p.description,
      totalAmount,
      installments: p.installments,
      startDate: fromDbDate(p.startDate),
      categoryName: p.category.name,
      categoryIcon: p.category.icon,
      paymentMethodName: p.paymentMethod.name,
      installmentAmount: p.installments > 0 ? round2(totalAmount / p.installments) : totalAmount,
      paid: paidRows.length,
      remaining: p.expenses.length - paidRows.length,
      paidAmount,
      remainingAmount: round2(p.expenses.reduce((a, e) => a + Number(e.amount), 0) - paidAmount),
      nextDate: next ? fromDbDate(next.date) : null,
      finished: paidRows.length === p.expenses.length,
    };
  });
}
