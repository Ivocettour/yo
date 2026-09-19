"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { checkRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { createUserWithDefaults } from "@/lib/auth/bootstrap";
import { requireUserForAction } from "@/lib/auth/current-user";
import { registrationAllowed } from "@/lib/auth/registration";
import { formDataToObject, issuesToFieldErrors } from "@/lib/validation/common";
import { changePasswordSchema, loginSchema, profileSchema, registerSchema } from "@/lib/validation/auth";
import { fail, GENERIC_ERROR, UNAUTHORIZED_MESSAGE, type ActionResult } from "./types";

function handleError(e: unknown): ActionResult<never> {
  if (e instanceof Error && e.message === "UNAUTHORIZED") return fail(UNAUTHORIZED_MESSAGE);
  console.error(e);
  return fail(GENERIC_ERROR);
}

async function clientKey(email: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${ip}:${email}`;
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult<undefined>> {
  let redirectTo = "/";
  try {
    const raw = formDataToObject(formData);
    const next = raw.next;
    if (next && next.startsWith("/") && !next.startsWith("//")) redirectTo = next;
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) return fail("Revisá los datos ingresados.", issuesToFieldErrors(parsed.error));
    const { email, password } = parsed.data;

    const key = await clientKey(email);
    const limit = checkRateLimit(key);
    if (!limit.allowed) {
      const min = Math.ceil(limit.retryAfterSec / 60);
      return fail(`Demasiados intentos. Probá de nuevo en ${min} minuto${min === 1 ? "" : "s"}.`);
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    // Comparamos siempre para no filtrar si el email existe (timing).
    const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !valid) return fail("Email o contraseña incorrectos.");

    clearRateLimit(key);
    await createSession(user.id);
  } catch (e) {
    return handleError(e);
  }
  redirect(redirectTo);
}

export async function register(_prev: unknown, formData: FormData): Promise<ActionResult<undefined>> {
  try {
    if (!(await registrationAllowed())) return fail("El registro está deshabilitado.");
    const parsed = registerSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los datos ingresados.", issuesToFieldErrors(parsed.error));
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return fail("Ya existe una cuenta con ese email.", { email: "Ya existe una cuenta con ese email." });
    const user = await createUserWithDefaults(parsed.data);
    await createSession(user.id);
  } catch (e) {
    return handleError(e);
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: unknown, formData: FormData): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const parsed = changePasswordSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los datos ingresados.", issuesToFieldErrors(parsed.error));
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
      return fail("La contraseña actual es incorrecta.", { currentPassword: "Contraseña incorrecta." });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
    // Cerramos las demas sesiones y abrimos una nueva para este dispositivo.
    await destroyAllSessions(user.id);
    await createSession(user.id);
    return { ok: true, data: undefined, message: "Contraseña actualizada." };
  } catch (e) {
    return handleError(e);
  }
}

export async function updateProfile(_prev: unknown, formData: FormData): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUserForAction();
    const parsed = profileSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return fail("Revisá los datos ingresados.", issuesToFieldErrors(parsed.error));
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timezone });
    } catch {
      return fail("Zona horaria inválida.", { timezone: "Zona horaria inválida." });
    }
    await prisma.user.update({ where: { id: user.id }, data: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Perfil actualizado." };
  } catch (e) {
    return handleError(e);
  }
}
