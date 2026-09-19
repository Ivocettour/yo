/**
 * Crea un usuario (con categorias y metodos de pago por defecto).
 *
 *   npm run user:create -- --email vos@mail.com --name "Tu Nombre" --password "clave-segura"
 *
 * Tambien acepta las variables USER_EMAIL, USER_NAME y USER_PASSWORD.
 * Si el usuario existe, actualiza la contraseña.
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from "../lib/defaults";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = (arg("email") ?? process.env.USER_EMAIL ?? "").trim().toLowerCase();
const name = (arg("name") ?? process.env.USER_NAME ?? "").trim();
const password = arg("password") ?? process.env.USER_PASSWORD ?? "";

if (!email || !email.includes("@") || !name || password.length < 8) {
  console.error('Uso: npm run user:create -- --email vos@mail.com --name "Tu Nombre" --password "minimo8caracteres"');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, name } });
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    console.log(`Usuario ${email} actualizado (nueva contraseña, sesiones cerradas).`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      timezone: process.env.DEFAULT_TIMEZONE || "America/Argentina/Buenos_Aires",
      categories: { create: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })) },
      paymentMethods: { create: DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, sortOrder: i })) },
    },
  });
  console.log(`Usuario ${email} creado. Ya podés iniciar sesión.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
