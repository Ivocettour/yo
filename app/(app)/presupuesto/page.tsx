import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { getBudgetProgress, getInstallmentPlans } from "@/lib/queries/budgets";
import { getCategories } from "@/lib/queries/expenses";
import { parseISO, todayInTimezone } from "@/lib/utils/dates";
import { BudgetsView } from "@/components/budgets/budgets-view";

export const metadata = { title: "Presupuesto" };

export default async function BudgetPage({ searchParams }: PageProps<"/presupuesto">) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const today = todayInTimezone(user.timezone);
  const { year: ty, month: tm } = parseISO(today);
  const year = clampInt(first(params.year), 2000, 2100, ty);
  const month = clampInt(first(params.month), 1, 12, tm);

  const [progress, categories, plans] = await Promise.all([
    getBudgetProgress(user.id, year, month),
    getCategories(user.id),
    getInstallmentPlans(user.id, today),
  ]);

  return (
    <div className="flex flex-col gap-4 animate-in">
      <h1 className="text-2xl font-bold tracking-tight">Presupuesto</h1>
      <Suspense>
        <BudgetsView progress={progress} categories={categories} plans={plans} isCurrentMonth={year === ty && month === tm} />
      </Suspense>
    </div>
  );
}

function clampInt(v: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}
