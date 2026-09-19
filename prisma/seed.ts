/**
 * Seed de datos de prueba.
 *
 *   npm run db:seed        -> crea el usuario demo con ~3 meses de gastos ficticios
 *   npm run seed:remove    -> elimina el usuario demo y TODOS sus datos
 *
 * El usuario demo se identifica por SEED_EMAIL (por defecto demo@gastos.local).
 * No mezcla datos con otros usuarios: todo cuelga del usuario demo.
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from "../lib/defaults";
import { addDays, addMonths, startOfMonth, todayInTimezone } from "../lib/utils/dates";
import { splitInstallments } from "../lib/utils/money";

export const SEED_EMAIL = process.env.SEED_EMAIL ?? "demo@gastos.local";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "demo1234";
const SEED_NAME = "Usuario Demo";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Generador pseudoaleatorio determinista para que el seed sea reproducible.
let seedState = 42;
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function between(min: number, max: number): number {
  return Math.round(min + rand() * (max - min));
}

const PLACES = ["Casa", "Facultad", "Trabajo", "Centro", "Palermo", "Belgrano", "Estación", "Gimnasio"];
const FOOD = ["Almuerzo", "Café", "Empanadas", "Pizza", "Sushi", "Hamburguesa", "Cena con amigos"];
const SHOPS = ["Zapatillas", "Remera", "Auriculares", "Regalo", "Libro"];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });
  if (existing) {
    console.log(`El usuario demo ${SEED_EMAIL} ya existe. Ejecutá "npm run seed:remove" primero si querés regenerarlo.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: SEED_EMAIL,
      name: SEED_NAME,
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      categories: { create: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })) },
      paymentMethods: { create: DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, sortOrder: i })) },
    },
    include: { categories: true, paymentMethods: true },
  });

  const cat = Object.fromEntries(user.categories.map((c) => [c.key!, c.id]));
  const pm = Object.fromEntries(user.paymentMethods.map((m) => [m.key!, m.id]));
  const today = todayInTimezone(user.timezone);
  const start = addMonths(startOfMonth(today), -2);

  const rows: {
    userId: string;
    categoryId: string;
    paymentMethodId: string;
    amount: number;
    date: Date;
    time?: string;
    description?: string;
    origin?: string;
    destination?: string;
  }[] = [];

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const date = new Date(`${d}T00:00:00.000Z`);
    const dow = date.getUTCDay();
    // Uber: 2-4 viajes por semana.
    if (rand() < (dow === 0 || dow === 6 ? 0.25 : 0.45)) {
      const origin = pick(PLACES);
      let destination = pick(PLACES);
      while (destination === origin) destination = pick(PLACES);
      rows.push({
        userId: user.id,
        categoryId: cat.uber,
        paymentMethodId: pick([pm.mercadopago, pm.credit, pm.debit]),
        amount: between(35, 120) * 100,
        date,
        time: `${String(between(7, 23)).padStart(2, "0")}:${String(between(0, 59)).padStart(2, "0")}`,
        description: `${origin} → ${destination}`,
        origin,
        destination,
      });
    }
    if (rand() < 0.6) {
      rows.push({ userId: user.id, categoryId: cat.food, paymentMethodId: pick([pm.cash, pm.debit, pm.mercadopago]), amount: between(25, 180) * 100, date, description: pick(FOOD) });
    }
    if (rand() < 0.2) {
      rows.push({ userId: user.id, categoryId: cat.groceries, paymentMethodId: pick([pm.debit, pm.credit]), amount: between(120, 600) * 100, date, description: "Supermercado" });
    }
    if (rand() < 0.15) {
      rows.push({ userId: user.id, categoryId: cat.transport, paymentMethodId: pm.debit, amount: between(8, 30) * 100, date, description: "SUBE" });
    }
    if (rand() < 0.08) {
      rows.push({ userId: user.id, categoryId: cat.entertainment, paymentMethodId: pick([pm.credit, pm.mercadopago]), amount: between(60, 300) * 100, date, description: pick(["Cine", "Salida", "Streaming", "Recital"]) });
    }
    if (rand() < 0.05) {
      rows.push({ userId: user.id, categoryId: cat.shopping, paymentMethodId: pm.credit, amount: between(150, 900) * 100, date, description: pick(SHOPS) });
    }
    if (d.endsWith("-05")) {
      rows.push({ userId: user.id, categoryId: cat.subscriptions, paymentMethodId: pm.credit, amount: 9900, date, description: "Spotify" });
      rows.push({ userId: user.id, categoryId: cat.services, paymentMethodId: pm.transfer, amount: between(200, 400) * 100, date, description: "Internet" });
    }
  }
  await prisma.expense.createMany({ data: rows });

  // Compra en 6 cuotas iniciada el mes pasado.
  const planStart = addMonths(startOfMonth(today), -1).replace(/-01$/, "-12");
  const total = 240000;
  const amounts = splitInstallments(total, 6);
  const plan = await prisma.installmentPlan.create({
    data: {
      userId: user.id,
      categoryId: cat.shopping,
      paymentMethodId: pm.credit,
      description: "Notebook (6 cuotas)",
      totalAmount: total,
      installments: 6,
      startDate: new Date(`${planStart}T00:00:00.000Z`),
    },
  });
  await prisma.expense.createMany({
    data: amounts.map((amount, i) => ({
      userId: user.id,
      categoryId: cat.shopping,
      paymentMethodId: pm.credit,
      amount,
      date: new Date(`${addMonths(planStart, i)}T00:00:00.000Z`),
      description: "Notebook (6 cuotas)",
      installments: 6,
      installmentNumber: i + 1,
      installmentPlanId: plan.id,
    })),
  });

  // Presupuestos del mes actual.
  const [year, month] = today.split("-").map(Number);
  await prisma.budget.createMany({
    data: [
      { userId: user.id, categoryId: null, amount: 500000, year, month },
      { userId: user.id, categoryId: cat.uber, amount: 100000, year, month },
      { userId: user.id, categoryId: cat.food, amount: 120000, year, month },
      { userId: user.id, categoryId: cat.shopping, amount: 80000, year, month },
    ],
  });

  console.log(`Seed listo: ${rows.length + 6} gastos para ${SEED_EMAIL} (contraseña: ${SEED_PASSWORD}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
