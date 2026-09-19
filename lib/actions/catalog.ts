"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth/current-user";
import { formDataToObject, issuesToFieldErrors } from "@/lib/validation/common";
import { categorySchema, paymentMethodSchema } from "@/lib/validation/category";
import { fail, GENERIC_ERROR, UNAUTHORIZED_MESSAGE, type ActionResult } from "./types";

function handleError(e: unknown): ActionResult<never> {
  if (e instanceof Error && e.message === "UNAUTHORIZED") return fail(UNAUTHORIZED_MESSAGE);
  console.error(e);
  return fail(GENERIC_ERROR);
}

function isUniqueError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}

// ---------- Categorias ----------

export async function createCategory(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = categorySchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos.", issuesToFieldErrors(parsed.error));
    const count = await prisma.category.count({ where: { userId: user.id } });
    const cat = await prisma.category.create({
      data: { userId: user.id, ...parsed.data, sortOrder: count },
      select: { id: true },
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: cat.id }, message: "Categoría creada." };
  } catch (e) {
    if (isUniqueError(e)) return fail("Ya existe una categoría con ese nombre.", { name: "Ya existe una categoría con ese nombre." });
    return handleError(e);
  }
}

export async function updateCategory(id: string, _prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = categorySchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos.", issuesToFieldErrors(parsed.error));
    const res = await prisma.category.updateMany({ where: { id, userId: user.id }, data: parsed.data });
    if (res.count === 0) return fail("La categoría no existe.");
    revalidatePath("/", "layout");
    return { ok: true, data: { id }, message: "Categoría actualizada." };
  } catch (e) {
    if (isUniqueError(e)) return fail("Ya existe una categoría con ese nombre.", { name: "Ya existe una categoría con ese nombre." });
    return handleError(e);
  }
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const res = await prisma.category.updateMany({ where: { id, userId: user.id }, data: { active } });
    if (res.count === 0) return fail("La categoría no existe.");
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: active ? "Categoría activada." : "Categoría desactivada." };
  } catch (e) {
    return handleError(e);
  }
}

/** Elimina una categoria solo si no tiene gastos ni presupuestos. Si los tiene, se desactiva. */
export async function deleteCategory(id: string): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const user = await requireUserForAction();
    const cat = await prisma.category.findFirst({
      where: { id, userId: user.id },
      select: { id: true, _count: { select: { expenses: true, installmentPlans: true } } },
    });
    if (!cat) return fail("La categoría no existe.");
    if (cat._count.expenses > 0 || cat._count.installmentPlans > 0) {
      await prisma.category.update({ where: { id: cat.id }, data: { active: false } });
      revalidatePath("/", "layout");
      return {
        ok: true,
        data: { deleted: false },
        message: "La categoría tiene gastos asociados, así que se desactivó en lugar de eliminarse.",
      };
    }
    await prisma.category.delete({ where: { id: cat.id } });
    revalidatePath("/", "layout");
    return { ok: true, data: { deleted: true }, message: "Categoría eliminada." };
  } catch (e) {
    return handleError(e);
  }
}

// ---------- Metodos de pago ----------

export async function createPaymentMethod(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = paymentMethodSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos.", issuesToFieldErrors(parsed.error));
    const count = await prisma.paymentMethod.count({ where: { userId: user.id } });
    const pm = await prisma.paymentMethod.create({
      data: { userId: user.id, ...parsed.data, sortOrder: count },
      select: { id: true },
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: pm.id }, message: "Método de pago creado." };
  } catch (e) {
    if (isUniqueError(e)) return fail("Ya existe un método con ese nombre.", { name: "Ya existe un método con ese nombre." });
    return handleError(e);
  }
}

export async function updatePaymentMethod(id: string, _prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserForAction();
    const parsed = paymentMethodSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los campos.", issuesToFieldErrors(parsed.error));
    const res = await prisma.paymentMethod.updateMany({ where: { id, userId: user.id }, data: parsed.data });
    if (res.count === 0) return fail("El método de pago no existe.");
    revalidatePath("/", "layout");
    return { ok: true, data: { id }, message: "Método de pago actualizado." };
  } catch (e) {
    if (isUniqueError(e)) return fail("Ya existe un método con ese nombre.", { name: "Ya existe un método con ese nombre." });
    return handleError(e);
  }
}

export async function setPaymentMethodActive(id: string, active: boolean): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const res = await prisma.paymentMethod.updateMany({ where: { id, userId: user.id }, data: { active } });
    if (res.count === 0) return fail("El método de pago no existe.");
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: active ? "Método activado." : "Método desactivado." };
  } catch (e) {
    return handleError(e);
  }
}

export async function deletePaymentMethod(id: string): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const user = await requireUserForAction();
    const pm = await prisma.paymentMethod.findFirst({
      where: { id, userId: user.id },
      select: { id: true, _count: { select: { expenses: true, installmentPlans: true } } },
    });
    if (!pm) return fail("El método de pago no existe.");
    if (pm._count.expenses > 0 || pm._count.installmentPlans > 0) {
      await prisma.paymentMethod.update({ where: { id: pm.id }, data: { active: false } });
      revalidatePath("/", "layout");
      return {
        ok: true,
        data: { deleted: false },
        message: "El método tiene gastos asociados, así que se desactivó en lugar de eliminarse.",
      };
    }
    await prisma.paymentMethod.delete({ where: { id: pm.id } });
    revalidatePath("/", "layout");
    return { ok: true, data: { deleted: true }, message: "Método de pago eliminado." };
  } catch (e) {
    return handleError(e);
  }
}
