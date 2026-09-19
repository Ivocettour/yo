"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { MonthHistory } from "@/lib/queries/dashboard";
import { formatMonthYear, parseISO } from "@/lib/utils/dates";
import { formatMoney, formatMoneyDiff, formatPercent } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { ComparisonPill } from "@/components/dashboard/dashboard-view";

export function MonthHistoryView({ data, today }: { data: MonthHistory; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Opciones: meses con datos + los ultimos 12 meses desde hoy (sin duplicar).
  const { year: ty, month: tm } = parseISO(today);
  const options = new Set<string>(data.monthsWithData);
  for (let i = 0; i < 12; i++) {
    const total = ty * 12 + (tm - 1) - i;
    options.add(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`);
  }
  const sorted = [...options].sort().reverse();
  const current = `${data.year}-${String(data.month).padStart(2, "0")}`;

  const onChange = (value: string) => {
    const [y, m] = value.split("-");
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", y);
    params.set("month", String(Number(m)));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const s = data.summary;
  return (
    <div className={cn("flex flex-col gap-4", pending && "opacity-70")}>
      <div className="max-w-xs">
        <Select value={current} onChange={(e) => onChange(e.target.value)} aria-label="Mes">
          {sorted.map((ym) => {
            const [y, m] = ym.split("-").map(Number);
            return (
              <option key={ym} value={ym}>
                {formatMonthYear(y, m)}
                {data.monthsWithData.includes(ym) ? "" : " (sin gastos)"}
              </option>
            );
          })}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label="Total gastado" value={formatMoney(s.total)} />
        <Tile label="Promedio diario" value={formatMoney(data.dailyAverage)} />
        <Tile label="Transacciones" value={String(s.count)} />
        <Tile label="Mayor gasto" value={formatMoney(s.max)} sub={s.maxExpense?.description || s.maxExpense?.categoryName} />
        <Tile
          label="Categoría principal"
          value={data.topCategory ? `${data.topCategory.icon} ${data.topCategory.name}` : "—"}
          sub={data.topCategory ? `${formatMoney(data.topCategory.total)} · ${formatPercent(data.topCategory.percent, 0)}` : undefined}
        />
        <Tile label="Total Uber" value={formatMoney(data.uber.total)} sub={`${data.uber.count} viaje${data.uber.count === 1 ? "" : "s"} · ${formatPercent(data.uber.percentOfTotal, 0)} del total`} />
      </div>

      <Card>
        <CardHeader title="Comparación con meses anteriores" subtitle={`Respecto a ${formatMonthYear(data.year, data.month)}`} />
        <CardBody className="pt-2">
          <ul className="divide-y divide-border/60">
            {data.previousMonths.map((m) => {
              const { year, month } = parseISO(m.label);
              return (
                <li key={m.key} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{formatMonthYear(year, month)}</p>
                    <p className="text-xs text-muted">
                      {m.count} transacci{m.count === 1 ? "ón" : "ones"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{formatMoney(m.total)}</p>
                    <p className="flex items-center justify-end gap-2 text-xs text-muted">
                      <span className={cn("tabular", m.comparison.diff > 0 ? "text-danger" : m.comparison.diff < 0 ? "text-success" : "")}>
                        {formatMoneyDiff(m.comparison.diff)}
                      </span>
                      <ComparisonPill comparison={m.comparison} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {data.byCategory.length ? (
        <Card>
          <CardHeader title="Por categoría" />
          <CardBody className="pt-2">
            <ul className="flex flex-col gap-3">
              {data.byCategory.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${c.color}1f` }} aria-hidden>
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="shrink-0 font-semibold tabular">{formatMoney(c.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${c.percent}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular text-muted">{formatPercent(c.percent, 0)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3 shadow-card border border-border/60">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-base font-semibold tabular sm:text-lg">{value}</p>
      {sub ? <p className="truncate text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
