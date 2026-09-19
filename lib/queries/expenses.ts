import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { fromDbDate, isISODate, toDbDate, type ISODate } from "@/lib/utils/dates";
import type { ExpenseLite } from "@/lib/utils/stats";
import { round2 } from "@/lib/utils/money";
import type { DateRange } from "@/lib/utils/periods";

export interface CategoryDTO {
  id: string;
  name: string;
  key: string | null;
  icon: string;
  color: string;
  active: boolean;
  sortOrder: number;
}

export interface PaymentMethodDTO {
  id: string;
  name: string;
  key: string | null;
  icon: string;
  active: boolean;
  sortOrder: number;
}

export interface ExpenseDTO {
  id: string;
  amount: number;
  description: string | null;
  date: ISODate;
  time: string | null;
  notes: string | null;
  origin: string | null;
  destination: string | null;
  installments: number;
  installmentNumber: number;
  installmentPlanId: string | null;
  createdAt: string;
  category: Pick<CategoryDTO, "id" | "name" | "icon" | "color" | "key">;
  paymentMethod: Pick<PaymentMethodDTO, "id" | "name" | "icon" | "key">;
}

export interface ExpenseFilters {
  from?: ISODate;
  to?: ISODate;
  categoryId?: string;
  paymentMethodId?: string;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
}

const expenseInclude = {
  category: { select: { id: true, name: true, icon: true, color: true, key: true } },
  paymentMethod: { select: { id: true, name: true, icon: true, key: true } },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

export function toExpenseDTO(row: ExpenseRow): ExpenseDTO {
  return {
    id: row.id,
    amount: round2(Number(row.amount)),
    description: row.description,
    date: fromDbDate(row.date),
    time: row.time,
    notes: row.notes,
    origin: row.origin,
    destination: row.destination,
    installments: row.installments,
    installmentNumber: row.installmentNumber,
    installmentPlanId: row.installmentPlanId,
    createdAt: row.createdAt.toISOString(),
    category: row.category,
    paymentMethod: row.paymentMethod,
  };
}

/** Construye el `where` de Prisma a partir de filtros, SIEMPRE acotado al usuario. */
export function buildExpenseWhere(userId: string, f: ExpenseFilters = {}): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { userId };
  if (f.from || f.to) {
    where.date = {};
    if (f.from && isISODate(f.from)) where.date.gte = toDbDate(f.from);
    if (f.to && isISODate(f.to)) where.date.lte = toDbDate(f.to);
  }
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.paymentMethodId) where.paymentMethodId = f.paymentMethodId;
  if (f.minAmount !== undefined || f.maxAmount !== undefined) {
    where.amount = {};
    if (f.minAmount !== undefined) where.amount.gte = f.minAmount;
    if (f.maxAmount !== undefined) where.amount.lte = f.maxAmount;
  }
  const q = f.q?.trim();
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { origin: { contains: q, mode: "insensitive" } },
      { destination: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
      { paymentMethod: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export const EXPENSE_PAGE_SIZE = 30;

export interface ExpensePage {
  items: ExpenseDTO[];
  nextPage: number | null;
  total: number;
}

/** Lista paginada, del mas reciente al mas antiguo. */
export async function listExpenses(
  userId: string,
  filters: ExpenseFilters,
  page = 0,
  pageSize = EXPENSE_PAGE_SIZE,
): Promise<ExpensePage> {
  const where = buildExpenseWhere(userId, filters);
  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: [{ date: "desc" }, { time: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      skip: page * pageSize,
      take: pageSize + 1,
    }),
    prisma.expense.count({ where }),
  ]);
  const hasMore = rows.length > pageSize;
  return {
    items: rows.slice(0, pageSize).map(toExpenseDTO),
    nextPage: hasMore ? page + 1 : null,
    total,
  };
}

export interface FilteredTotals {
  total: number;
  count: number;
  average: number;
  max: number;
}

export async function getFilteredTotals(userId: string, filters: ExpenseFilters): Promise<FilteredTotals> {
  const agg = await prisma.expense.aggregate({
    where: buildExpenseWhere(userId, filters),
    _sum: { amount: true },
    _count: { _all: true },
    _avg: { amount: true },
    _max: { amount: true },
  });
  return {
    total: round2(Number(agg._sum.amount ?? 0)),
    count: agg._count._all,
    average: round2(Number(agg._avg.amount ?? 0)),
    max: round2(Number(agg._max.amount ?? 0)),
  };
}

export async function getExpenseById(userId: string, id: string): Promise<ExpenseDTO | null> {
  const row = await prisma.expense.findFirst({ where: { id, userId }, include: expenseInclude });
  return row ? toExpenseDTO(row) : null;
}

/** Gastos "livianos" de un rango para calculos de estadisticas en memoria. */
export async function getExpensesLite(userId: string, range: DateRange, filters: ExpenseFilters = {}): Promise<ExpenseLite[]> {
  const rows = await prisma.expense.findMany({
    where: buildExpenseWhere(userId, { ...filters, from: range.from, to: range.to }),
    select: {
      id: true,
      amount: true,
      date: true,
      time: true,
      description: true,
      categoryId: true,
      paymentMethodId: true,
      category: { select: { name: true, icon: true, color: true, key: true } },
      paymentMethod: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    amount: round2(Number(r.amount)),
    date: fromDbDate(r.date),
    time: r.time,
    description: r.description,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    categoryIcon: r.category.icon,
    categoryColor: r.category.color,
    categoryKey: r.category.key,
    paymentMethodId: r.paymentMethodId,
    paymentMethodName: r.paymentMethod.name,
  }));
}

export async function getExpensesByDate(userId: string, date: ISODate): Promise<ExpenseDTO[]> {
  const rows = await prisma.expense.findMany({
    where: { userId, date: toDbDate(date) },
    include: expenseInclude,
    orderBy: [{ time: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return rows.map(toExpenseDTO);
}

export async function getCategories(userId: string, options?: { activeOnly?: boolean }): Promise<CategoryDTO[]> {
  return prisma.category.findMany({
    where: { userId, ...(options?.activeOnly ? { active: true } : {}) },
    select: { id: true, name: true, key: true, icon: true, color: true, active: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPaymentMethods(userId: string, options?: { activeOnly?: boolean }): Promise<PaymentMethodDTO[]> {
  return prisma.paymentMethod.findMany({
    where: { userId, ...(options?.activeOnly ? { active: true } : {}) },
    select: { id: true, name: true, key: true, icon: true, active: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Primer y ultimo mes con gastos (para selectores de historial). */
export async function getExpenseDateBounds(userId: string): Promise<{ first: ISODate; last: ISODate } | null> {
  const [first, last] = await Promise.all([
    prisma.expense.findFirst({ where: { userId }, orderBy: { date: "asc" }, select: { date: true } }),
    prisma.expense.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { date: true } }),
  ]);
  if (!first || !last) return null;
  return { first: fromDbDate(first.date), last: fromDbDate(last.date) };
}
