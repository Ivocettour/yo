import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getCalendarData, getMonthHistory, getStatsData } from "@/lib/queries/dashboard";
import { getExpensesByDate } from "@/lib/queries/expenses";
import { isISODate, parseISO, todayInTimezone } from "@/lib/utils/dates";
import { isPeriodKey } from "@/lib/utils/periods";
import { cn } from "@/lib/utils/cn";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { StatsView } from "@/components/stats/stats-view";
import { CalendarView } from "@/components/stats/calendar-view";
import { MonthHistoryView } from "@/components/stats/month-history-view";

export const metadata = { title: "Estadísticas" };

const TABS = [
  { key: "graficos", label: "Gráficos" },
  { key: "calendario", label: "Calendario" },
  { key: "mensual", label: "Historial mensual" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function StatsPage({ searchParams }: PageProps<"/estadisticas">) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const rawTab = first(params.tab);
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : rawTab === "uber" ? "graficos" : "graficos";
  const today = todayInTimezone(user.timezone);
  const { year: ty, month: tm } = parseISO(today);
  const year = clampInt(first(params.year), 2000, 2100, ty);
  const month = clampInt(first(params.month), 1, 12, tm);

  const tabLinks = (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" aria-label="Secciones de estadísticas">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/estadisticas?tab=${t.key}`}
          aria-current={tab === t.key ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            tab === t.key ? "bg-primary text-primary-foreground" : "bg-surface text-muted border border-border hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "calendario") {
    const day = first(params.day);
    const selectedDay = isISODate(day) ? day : null;
    const [cal, selectedExpenses] = await Promise.all([
      getCalendarData(user.id, year, month),
      selectedDay ? getExpensesByDate(user.id, selectedDay) : Promise.resolve([]),
    ]);
    return (
      <div className="flex flex-col gap-4 animate-in">
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
        {tabLinks}
        <Suspense>
          <CalendarView
            year={cal.year}
            month={cal.month}
            days={Object.fromEntries(cal.days)}
            max={cal.max}
            total={cal.total}
            today={today}
            selectedDay={selectedDay}
            selectedExpenses={selectedExpenses}
          />
        </Suspense>
      </div>
    );
  }

  if (tab === "mensual") {
    const data = await getMonthHistory(user.id, user.timezone, year, month);
    return (
      <div className="flex flex-col gap-4 animate-in">
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
        {tabLinks}
        <Suspense>
          <MonthHistoryView data={data} today={today} />
        </Suspense>
      </div>
    );
  }

  const periodKey = isPeriodKey(first(params.period)) ? first(params.period) : "month";
  const data = await getStatsData(user.id, user.timezone, {
    periodKey,
    custom: { from: first(params.from), to: first(params.to) },
    granularity: first(params.granularity),
  });

  return (
    <div className="flex flex-col gap-4 animate-in">
      <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
      {tabLinks}
      <Suspense>
        <PeriodSelector value={data.period.key} from={data.period.from} to={data.period.to} />
      </Suspense>
      <Suspense>
        <StatsView data={data} />
      </Suspense>
    </div>
  );
}

function clampInt(v: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}
