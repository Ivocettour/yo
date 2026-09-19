"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth/current-user";
import { addMonths, toDbDate } from "@/lib/utils/dates";
import { round2, splitInstallments } from "@/lib/utils/money";
import { UBER_CATEGORY_KEY } from "@/lib/utils/stats";
import { formDataToObject, issuesToFieldErrors } from "@/lib/validation/common";
import { expenseInputSchema, expenseUpdateSchema, uberInputSchema } from "@/lib/validation/expense";
import { listExpenses, type ExpenseFilters, type ExpensePage } from "@/lib/queries/expenses";
import { parseFilters } from "@/lib/validation/filters";
import { fail, GENERIC_ERROR, UNAUTHORIZED_MESSAGE, type ActionResult } from "./types";

/** Invalida todas las pantallas que dependen de gastos. */
function revalidateExpenses() {
  revalidatePath("/", "layout");
}

async function assertOwnedRefs(userId: string, categoryId: string, paymentMethodId: string) {
  const [category, method] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } }),
    prisma.paymentMethod.findFirst({ where: { id: paymentMethodId, userId }, select: { id: true } }),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!category) fieldErrors.categoryId = "Elegí una categoría válida.";
  if (!method) fieldErrors.paymentMethodId = "Elegí un método de pago válido.";
  return Object.keys(fieldErrors).length ? fieldErrors : null;
}

function handleError(e: unknown): ActionResult<never> {
  if (e instanceof Error && e.message === "UNAUTHORIZED") return fail(UNAUTHORIZED_MESSAGE);
  console.error(e);
  return fail(GENERIC_ERROR);
}

export async function createExpense(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = expenseInputSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos marcados.", issuesToFieldErrors(parsed.error));
    const d = parsed.data;
    const refErrors = await assertOwnedRefs(user.id, d.categoryId, d.paymentMethodId);
    if (refErrors) return fail("Revisá los campos marcados.", refErrors);

    const base = {
      userId: user.id,
      categoryId: d.categoryId,
      paymentMethodId: d.paymentMethodId,
      description: d.description,
      time: d.time,
      notes: d.notes,
      origin: d.origin,
      destination: d.destination,
    };

    if (d.installments <= 1) {
      const expense = await prisma.expense.create({
        data: { ...base, amount: d.amount, date: toDbDate(d.date), installments: 1, installmentNumber: 1 },
        select: { id: true },
      });
      revalidateExpenses();
      return { ok: true, data: { id: expense.id }, message: "Gasto registrado." };
    }

    // Compra en cuotas: creamos el plan y una cuota (Expense) por mes desde la cuota actual hasta la ultima.
    const total = d.amountIsTotal ? d.amount : round2(d.amount * d.installments);
    const amounts = splitInstallments(total, d.installments);
    const startDate = addMonths(d.date, -(d.installmentNumber - 1));
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.installmentPlan.create({
        data: {
          userId: user.id,
          categoryId: d.categoryId,
          paymentMethodId: d.paymentMethodId,
          description: d.description ?? "Compra en cuotas",
          totalAmount: total,
          installments: d.installments,
          startDate: toDbDate(startDate),
          notes: d.notes,
        },
        select: { id: true },
      });
      const rows = [];
      for (let n = d.installmentNumber; n <= d.installments; n++) {
        rows.push({
          ...base,
          amount: amounts[n - 1],
          date: toDbDate(addMonths(d.date, n - d.installmentNumber)),
          installments: d.installments,
          installmentNumber: n,
          installmentPlanId: plan.id,
        });
      }
      await tx.expense.createMany({ data: rows });
      const first = await tx.expense.findFirst({
        where: { installmentPlanId: plan.id, installmentNumber: d.installmentNumber },
        select: { id: true },
      });
      return first!;
    });
    revalidateExpenses();
    return {
      ok: true,
      data: { id: result.id },
      message: `Compra en ${d.installments} cuotas registrada.`,
    };
  } catch (e) {
    return handleError(e);
  }
}

export async function createUberExpense(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = uberInputSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos marcados.", issuesToFieldErrors(parsed.error));
    const d = parsed.data;

    let uber = await prisma.category.findFirst({ where: { userId: user.id, key: UBER_CATEGORY_KEY } });
    if (!uber) {
      uber = await prisma.category.create({
        data: { userId: user.id, name: "Uber", key: UBER_CATEGORY_KEY, icon: "🚗", color: "#111827" },
      });
    }
    const method = await prisma.paymentMethod.findFirst({ where: { id: d.paymentMethodId, userId: user.id } });
    if (!method) return fail("Revisá los campos marcados.", { paymentMethodId: "Elegí un método de pago válido." });

    const description =
      d.description ?? (d.origin || d.destination ? `${d.origin ?? "?"} → ${d.destination ?? "?"}` : "Viaje en Uber");

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: uber.id,
        paymentMethodId: method.id,
        amount: d.amount,
        date: toDbDate(d.date),
        time: d.time,
        description,
        origin: d.origin,
        destination: d.destination,
        notes: d.notes,
      },
      select: { id: true },
    });
    revalidateExpenses();
    return { ok: true, data: { id: expense.id }, message: "Viaje en Uber registrado." };
  } catch (e) {
    return handleError(e);
  }
}

export async function updateExpense(id: string, _prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!existing) return fail("El gasto no existe o no te pertenece.");
    const parsed = expenseUpdateSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos marcados.", issuesToFieldErrors(parsed.error));
    const d = parsed.data;
    const refErrors = await assertOwnedRefs(user.id, d.categoryId, d.paymentMethodId);
    if (refErrors) return fail("Revisá los campos marcados.", refErrors);

    await prisma.expense.update({
      where: { id: existing.id },
      data: {
        amount: d.amount,
        categoryId: d.categoryId,
        paymentMethodId: d.paymentMethodId,
        description: d.description,
        date: toDbDate(d.date),
        time: d.time,
        notes: d.notes,
        origin: d.origin,
        destination: d.destination,
      },
    });
    revalidateExpenses();
    return { ok: true, data: { id }, message: "Gasto actualizado." };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteExpense(id: string, options?: { deletePlan?: boolean }): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const existing = await prisma.expense.findFirst({
      where: { id, userId: user.id },
      select: { id: true, installmentPlanId: true },
    });
    if (!existing) return fail("El gasto no existe o no te pertenece.");

    if (options?.deletePlan && existing.installmentPlanId) {
      // Borrar el plan elimina todas sus cuotas (onDelete: Cascade).
      await prisma.installmentPlan.deleteMany({ where: { id: existing.installmentPlanId, userId: user.id } });
      revalidateExpenses();
      return { ok: true, data: undefined, message: "Compra en cuotas eliminada." };
    }

    await prisma.expense.delete({ where: { id: existing.id } });
    if (existing.installmentPlanId) {
      const left = await prisma.expense.count({ where: { installmentPlanId: existing.installmentPlanId } });
      if (left === 0) {
        await prisma.installmentPlan.deleteMany({ where: { id: existing.installmentPlanId, userId: user.id } });
      }
    }
    revalidateExpenses();
    return { ok: true, data: undefined, message: "Gasto eliminado." };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteInstallmentPlan(planId: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const res = await prisma.installmentPlan.deleteMany({ where: { id: planId, userId: user.id } });
    if (res.count === 0) return fail("El plan no existe o no te pertenece.");
    revalidateExpenses();
    return { ok: true, data: undefined, message: "Plan de cuotas eliminado." };
  } catch (e) {
    return handleError(e);
  }
}

/** Paginacion progresiva de la lista de gastos (usada por "Cargar mas"). */
export async function loadMoreExpenses(filters: ExpenseFilters, page: number): Promise<ActionResult<ExpensePage>> {
  try {
    const user = await requireUserForAction();
    const safePage = Number.isInteger(page) && page >= 0 && page < 10_000 ? page : 0;
    const data = await listExpenses(user.id, parseFilters(filters), safePage);
    return { ok: true, data };
  } catch (e) {
    return handleError(e);
  }
}
