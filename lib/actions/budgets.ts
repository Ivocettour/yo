"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth/current-user";
import { formDataToObject, issuesToFieldErrors } from "@/lib/validation/common";
import { budgetSchema } from "@/lib/validation/budget";
import { fail, GENERIC_ERROR, UNAUTHORIZED_MESSAGE, type ActionResult } from "./types";

function handleError(e: unknown): ActionResult<never> {
  if (e instanceof Error && e.message === "UNAUTHORIZED") return fail(UNAUTHORIZED_MESSAGE);
  console.error(e);
  return fail(GENERIC_ERROR);
}

/** Crea o actualiza el presupuesto de un mes (general si categoryId es null). */
export async function upsertBudget(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = budgetSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos.", issuesToFieldErrors(parsed.error));
    const d = parsed.data;
    if (d.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: d.categoryId, userId: user.id }, select: { id: true } });
      if (!cat) return fail("Elegí una categoría válida.", { categoryId: "Categoría inválida." });
    }
    // Postgres trata NULL como distinto en unique, asi que resolvemos manualmente.
    const existing = await prisma.budget.findFirst({
      where: { userId: user.id, categoryId: d.categoryId, year: d.year, month: d.month },
      select: { id: true },
    });
    const budget = existing
      ? await prisma.budget.update({ where: { id: existing.id }, data: { amount: d.amount }, select: { id: true } })
      : await prisma.budget.create({
          data: { userId: user.id, categoryId: d.categoryId, amount: d.amount, year: d.year, month: d.month },
          select: { id: true },
        });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: budget.id }, message: "Presupuesto guardado." };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteBudget(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const res = await prisma.budget.deleteMany({ where: { id, userId: user.id } });
    if (res.count === 0) return fail("El presupuesto no existe.");
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Presupuesto eliminado." };
  } catch (e) {
    return handleError(e);
  }
}

/** Copia los presupuestos del mes anterior al mes indicado (sin pisar los existentes). */
export async function copyBudgetsFromPreviousMonth(year: number, month: number): Promise<ActionResult<{ copied: number }>> {
  try {
    const user = await requireUserForAction();
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return fail("Mes inválido.");
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const [source, existing] = await Promise.all([
      prisma.budget.findMany({ where: { userId: user.id, year: prevYear, month: prevMonth } }),
      prisma.budget.findMany({ where: { userId: user.id, year, month }, select: { categoryId: true } }),
    ]);
    if (source.length === 0) return fail("El mes anterior no tiene presupuestos para copiar.");
    const existingKeys = new Set(existing.map((b) => b.categoryId ?? "__general__"));
    const toCreate = source.filter((b) => !existingKeys.has(b.categoryId ?? "__general__"));
    if (toCreate.length > 0) {
      await prisma.budget.createMany({
        data: toCreate.map((b) => ({ userId: user.id, categoryId: b.categoryId, amount: b.amount, year, month })),
      });
    }
    revalidatePath("/", "layout");
    return { ok: true, data: { copied: toCreate.length }, message: `${toCreate.length} presupuesto(s) copiado(s).` };
  } catch (e) {
    return handleError(e);
  }
}
