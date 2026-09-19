import "server-only";
import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from "@/lib/defaults";
import { DEFAULT_TIMEZONE } from "@/lib/utils/dates";
import { hashPassword } from "./password";

/**
 * Crea un usuario con sus categorias y metodos de pago por defecto.
 * Usado por /register, el seed y el script user:create.
 */
export async function createUserWithDefaults(input: { email: string; name: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      timezone: process.env.DEFAULT_TIMEZONE || DEFAULT_TIMEZONE,
      categories: {
        create: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })),
      },
      paymentMethods: {
        create: DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, sortOrder: i })),
      },
    },
    select: { id: true, email: true, name: true },
  });
}

/** Garantiza que un usuario existente tenga las categorias/metodos base (idempotente). */
export async function ensureUserDefaults(userId: string) {
  const [cats, methods] = await Promise.all([
    prisma.category.count({ where: { userId } }),
    prisma.paymentMethod.count({ where: { userId } }),
  ]);
  if (cats === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, userId, sortOrder: i })),
    });
  }
  if (methods === 0) {
    await prisma.paymentMethod.createMany({
      data: DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, userId, sortOrder: i })),
    });
  }
}
