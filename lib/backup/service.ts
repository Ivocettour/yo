import "server-only";
import { prisma } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/utils/dates";
import { round2 } from "@/lib/utils/money";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  expenseDedupKey,
  expensesToCsv,
  type BackupFile,
  type ParsedImport,
} from "./format";

/** Construye el backup completo del usuario. Solo incluye datos del usuario indicado. */
export async function buildBackup(userId: string): Promise<BackupFile> {
  const [user, categories, paymentMethods, plans, expenses, budgets] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.category.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.installmentPlan.findMany({
      where: { userId },
      include: { category: { select: { name: true } }, paymentMethod: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { userId },
      include: { category: { select: { name: true, key: true } }, paymentMethod: { select: { name: true, key: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.budget.findMany({ where: { userId }, include: { category: { select: { name: true } } } }),
  ]);

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user,
    categories: categories.map((c) => ({ id: c.id, name: c.name, key: c.key, icon: c.icon, color: c.color, active: c.active })),
    paymentMethods: paymentMethods.map((m) => ({ id: m.id, name: m.name, key: m.key, icon: m.icon, active: m.active })),
    installmentPlans: plans.map((p) => ({
      id: p.id,
      description: p.description,
      totalAmount: round2(Number(p.totalAmount)),
      installments: p.installments,
      startDate: fromDbDate(p.startDate),
      category: p.category.name,
      paymentMethod: p.paymentMethod.name,
      notes: p.notes,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      amount: round2(Number(e.amount)),
      date: fromDbDate(e.date),
      time: e.time,
      description: e.description,
      notes: e.notes,
      origin: e.origin,
      destination: e.destination,
      category: e.category.name,
      categoryKey: e.category.key,
      paymentMethod: e.paymentMethod.name,
      paymentMethodKey: e.paymentMethod.key,
      installments: e.installments,
      installmentNumber: e.installmentNumber,
      installmentPlanId: e.installmentPlanId,
      createdAt: e.createdAt.toISOString(),
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      category: b.category?.name ?? null,
      amount: round2(Number(b.amount)),
      month: b.month,
      year: b.year,
    })),
  };
}

export async function buildCsvExport(userId: string): Promise<string> {
  const backup = await buildBackup(userId);
  return expensesToCsv(backup.expenses);
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  categoriesCreated: number;
  paymentMethodsCreated: number;
  plansCreated: number;
  budgetsUpserted: number;
  errors: string[];
}

/**
 * Importa un backup ya validado dentro de la cuenta del usuario.
 * - Nunca toca datos de otros usuarios: todas las busquedas/creaciones llevan userId.
 * - Evita duplicados por id (si el id ya existe en la cuenta) o por clave natural.
 */
export async function importBackup(userId: string, parsed: ParsedImport): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    categoriesCreated: 0,
    paymentMethodsCreated: 0,
    plansCreated: 0,
    budgetsUpserted: 0,
    errors: [...parsed.errors],
  };

  await prisma.$transaction(
    async (tx) => {
      // --- Categorias (por nombre, case-insensitive) ---
      const existingCats = await tx.category.findMany({ where: { userId } });
      const catByName = new Map(existingCats.map((c) => [c.name.toLowerCase(), c]));
      const catByKey = new Map(existingCats.filter((c) => c.key).map((c) => [c.key!, c]));
      const backupCatMeta = new Map(parsed.categories.map((c) => [c.name.toLowerCase(), c]));

      async function resolveCategory(name: string, key: string | null): Promise<string> {
        if (key && catByKey.has(key)) return catByKey.get(key)!.id;
        const lower = name.toLowerCase();
        const found = catByName.get(lower);
        if (found) return found.id;
        const meta = backupCatMeta.get(lower);
        const created = await tx.category.create({
          data: {
            userId,
            name: name.trim(),
            key: key && !catByKey.has(key) ? key : null,
            icon: meta?.icon ?? "🏷️",
            color: meta?.color ?? "#6366f1",
            active: meta?.active ?? true,
            sortOrder: existingCats.length + catByName.size,
          },
        });
        catByName.set(lower, created);
        if (created.key) catByKey.set(created.key, created);
        summary.categoriesCreated += 1;
        return created.id;
      }

      // --- Metodos de pago ---
      const existingPms = await tx.paymentMethod.findMany({ where: { userId } });
      const pmByName = new Map(existingPms.map((m) => [m.name.toLowerCase(), m]));
      const pmByKey = new Map(existingPms.filter((m) => m.key).map((m) => [m.key!, m]));
      const backupPmMeta = new Map(parsed.paymentMethods.map((m) => [m.name.toLowerCase(), m]));

      async function resolvePaymentMethod(name: string, key: string | null): Promise<string> {
        if (key && pmByKey.has(key)) return pmByKey.get(key)!.id;
        const lower = name.toLowerCase();
        const found = pmByName.get(lower);
        if (found) return found.id;
        const meta = backupPmMeta.get(lower);
        const created = await tx.paymentMethod.create({
          data: {
            userId,
            name: name.trim(),
            key: key && !pmByKey.has(key) ? key : null,
            icon: meta?.icon ?? "💳",
            active: meta?.active ?? true,
            sortOrder: existingPms.length + pmByName.size,
          },
        });
        pmByName.set(lower, created);
        if (created.key) pmByKey.set(created.key, created);
        summary.paymentMethodsCreated += 1;
        return created.id;
      }

      // --- Planes de cuotas (mapeo id viejo -> id nuevo) ---
      const planIdMap = new Map<string, string>();
      const existingPlanIds = new Set(
        (await tx.installmentPlan.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id),
      );
      for (const p of parsed.plans) {
        if (existingPlanIds.has(p.id)) {
          planIdMap.set(p.id, p.id);
          continue;
        }
        const created = await tx.installmentPlan.create({
          data: {
            userId,
            categoryId: await resolveCategory(p.category, null),
            paymentMethodId: await resolvePaymentMethod(p.paymentMethod, null),
            description: p.description,
            totalAmount: p.totalAmount,
            installments: p.installments,
            startDate: toDbDate(p.startDate),
            notes: p.notes,
          },
          select: { id: true },
        });
        planIdMap.set(p.id, created.id);
        summary.plansCreated += 1;
      }

      // --- Gastos (dedupe por id propio o clave natural) ---
      const ids = parsed.expenses.map((e) => e.id).filter((id): id is string => Boolean(id));
      // Ids ya usados: si pertenecen a esta cuenta es un duplicado; si pertenecen a otra
      // cuenta (o a otra fila) simplemente no reutilizamos el id (se genera uno nuevo).
      const idRows = ids.length ? await tx.expense.findMany({ where: { id: { in: ids } }, select: { id: true, userId: true } }) : [];
      const existingIds = new Set(idRows.filter((r) => r.userId === userId).map((r) => r.id));
      const takenIds = new Set(idRows.map((r) => r.id));
      const dates = [...new Set(parsed.expenses.map((e) => e.date))];
      const naturalKeys = new Set<string>();
      if (dates.length) {
        const existingRows = await tx.expense.findMany({
          where: { userId, date: { in: dates.map(toDbDate) } },
          select: { date: true, amount: true, description: true, time: true, category: { select: { name: true } } },
        });
        for (const r of existingRows) {
          naturalKeys.add(
            expenseDedupKey({
              date: fromDbDate(r.date),
              amount: round2(Number(r.amount)),
              description: r.description,
              category: r.category.name,
              time: r.time,
            }),
          );
        }
      }

      const toCreate = [];
      for (const e of parsed.expenses) {
        if (e.id && existingIds.has(e.id)) {
          summary.skipped += 1;
          continue;
        }
        const key = expenseDedupKey(e);
        if (naturalKeys.has(key)) {
          summary.skipped += 1;
          continue;
        }
        naturalKeys.add(key);
        toCreate.push({
          userId,
          // Conservamos el id original si esta libre para que futuras importaciones lo detecten.
          ...(e.id && !takenIds.has(e.id) && /^[a-z0-9_-]{8,64}$/i.test(e.id) ? { id: e.id } : {}),
          amount: e.amount,
          date: toDbDate(e.date),
          time: e.time,
          description: e.description,
          notes: e.notes,
          origin: e.origin,
          destination: e.destination,
          categoryId: await resolveCategory(e.category, e.categoryKey),
          paymentMethodId: await resolvePaymentMethod(e.paymentMethod, e.paymentMethodKey),
          installments: Math.max(1, e.installments),
          installmentNumber: Math.min(Math.max(1, e.installmentNumber), Math.max(1, e.installments)),
          installmentPlanId: e.installmentPlanId ? (planIdMap.get(e.installmentPlanId) ?? null) : null,
        });
      }
      if (toCreate.length) {
        // createMany en lotes para no exceder limites de parametros.
        for (let i = 0; i < toCreate.length; i += 500) {
          const chunk = toCreate.slice(i, i + 500);
          const res = await tx.expense.createMany({ data: chunk, skipDuplicates: true });
          summary.imported += res.count;
          summary.skipped += chunk.length - res.count;
        }
      }

      // --- Presupuestos ---
      for (const b of parsed.budgets) {
        const categoryId = b.category ? await resolveCategory(b.category, null) : null;
        const existing = await tx.budget.findFirst({
          where: { userId, categoryId, year: b.year, month: b.month },
          select: { id: true },
        });
        if (existing) {
          await tx.budget.update({ where: { id: existing.id }, data: { amount: b.amount } });
        } else {
          await tx.budget.create({ data: { userId, categoryId, amount: b.amount, year: b.year, month: b.month } });
        }
        summary.budgetsUpserted += 1;
      }
    },
    { timeout: 60_000 },
  );

  return summary;
}
