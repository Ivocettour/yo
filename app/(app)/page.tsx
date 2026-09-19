import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { isPeriodKey } from "@/lib/utils/periods";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PeriodSelector } from "@/components/dashboard/period-selector";

export const metadata = { title: "Inicio" };

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const periodKey = isPeriodKey(first(params.period)) ? first(params.period) : "month";
  const data = await getDashboardData(user.id, user.timezone, periodKey, { from: first(params.from), to: first(params.to) });

  return (
    <div className="flex flex-col gap-4 animate-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <Suspense>
          <PeriodSelector value={data.period.key} from={data.period.from} to={data.period.to} />
        </Suspense>
      </div>
      <DashboardView data={data} userName={user.name} />
    </div>
  );
}
