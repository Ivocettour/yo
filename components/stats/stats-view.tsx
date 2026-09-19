"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Car } from "lucide-react";
import type { Granularity, StatsData } from "@/lib/queries/dashboard";
import { formatMoney, formatPercent } from "@/lib/utils/money";
import { seriesLabel } from "@/lib/utils/stats";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { BarsChart, DonutChart, EvolutionChart } from "@/components/charts/charts";

const PM_COLORS = ["#4f46e5", "#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#64748b", "#ec4899", "#eab308"];

export function StatsView({ data }: { data: StatsData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setGranularity = (g: Granularity) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("granularity", g);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const donut = data.byCategory.map((c) => ({ id: c.id, name: `${c.icon} ${c.name}`, total: c.total, color: c.color ?? "#6366f1", percent: c.percent }));
  const evolution = data.evolution.map((p) => ({ key: p.key, label: seriesLabel(p.key, data.granularity), total: p.total, count: p.count }));
  const pms = data.byPaymentMethod.map((m, i) => ({ id: m.id, name: m.name, total: m.total, count: m.count, color: PM_COLORS[i % PM_COLORS.length] }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Total" value={formatMoney(data.summary.total)} />
        <Tile label="Transacciones" value={String(data.summary.count)} />
        <Tile label="Promedio" value={formatMoney(data.summary.average)} />
        <Tile label="Mayor gasto" value={formatMoney(data.summary.max)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Gastos por categoría" subtitle={data.period.label} />
          <CardBody className="pt-2">
            <DonutChart data={donut} centerLabel="Total" centerValue={formatMoney(data.summary.total, { compact: true })} />
            {donut.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {data.byCategory.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {c.icon} {c.name}
                      <span className="ml-1 text-xs text-muted">({c.count})</span>
                    </span>
                    <span className="font-semibold tabular">{formatMoney(c.total)}</span>
                    <span className="w-11 text-right text-xs tabular text-muted">{formatPercent(c.percent, 0)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Evolución de gastos" subtitle={data.granularity === "month" ? "Últimos meses" : data.period.label} />
          <CardBody className="flex flex-col gap-3 pt-3">
            <Segmented
              size="sm"
              ariaLabel="Granularidad"
              value={data.granularity}
              onChange={setGranularity}
              options={[
                { value: "day", label: "Diario" },
                { value: "week", label: "Semanal" },
                { value: "month", label: "Mensual" },
              ]}
              className={pending ? "opacity-60" : undefined}
            />
            <EvolutionChart data={evolution} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Métodos de pago" subtitle="Distribución del gasto" />
          <CardBody className="pt-2">
            <BarsChart data={pms} horizontal height={Math.max(160, pms.length * 44)} />
            {pms.length ? (
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {data.byPaymentMethod.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PM_COLORS[i % PM_COLORS.length] }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="text-xs tabular text-muted">{formatPercent(m.percent, 0)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>

        <UberStatsCard data={data} />
      </div>
    </div>
  );
}

function UberStatsCard({ data }: { data: StatsData }) {
  const { uber } = data;
  const byMonth = data.uberByMonth.map((p) => ({ id: p.key, name: seriesLabel(p.key, "month"), total: p.total, count: p.count }));
  const byDay = data.uberByDay.map((p) => ({ key: p.key, label: seriesLabel(p.key, "day"), total: p.total, count: p.count }));
  return (
    <Card id="uber">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-uber text-background">
              <Car className="h-4 w-4" />
            </span>
            Estadísticas de Uber
          </span>
        }
        subtitle={data.period.label}
      />
      <CardBody className="flex flex-col gap-5 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Viajes" value={String(uber.count)} compact />
          <Tile label="Total" value={formatMoney(uber.total)} compact />
          <Tile label="Promedio por viaje" value={formatMoney(uber.average)} compact />
          <Tile label="% del gasto total" value={formatPercent(uber.percentOfTotal, 1)} compact />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Evolución mensual</p>
          <BarsChart data={byMonth} height={160} color="var(--uber)" />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Gasto por día</p>
          <EvolutionChart data={byDay} height={160} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Por día de la semana</p>
          <BarsChart data={data.uberByWeekday.map((d) => ({ id: String(d.day), name: d.label, total: d.total, count: d.count }))} height={150} color="var(--uber)" />
        </div>
      </CardBody>
    </Card>
  );
}

function Tile({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "rounded-2xl bg-surface-2 px-3 py-2.5" : "rounded-2xl bg-surface px-4 py-3 shadow-card border border-border/60"}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-base font-semibold tabular sm:text-lg">{value}</p>
    </div>
  );
}
