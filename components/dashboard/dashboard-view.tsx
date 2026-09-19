import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Car, ChevronRight, Minus, Plus } from "lucide-react";
import type { DashboardData } from "@/lib/queries/dashboard";
import { formatDateHuman, formatMonthYear, parseISO } from "@/lib/utils/dates";
import { formatMoney, formatMoneyDiff, formatPercent } from "@/lib/utils/money";
import { seriesLabel, type Comparison } from "@/lib/utils/stats";
import { cn } from "@/lib/utils/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { SparkArea } from "@/components/charts/charts";

export function DashboardView({ data, userName }: { data: DashboardData; userName: string }) {
  const { summary, period, uber, comparison, monthComparison, byCategory, recent, budgets, today } = data;
  const hasData = summary.count > 0;
  const firstName = userName.split(" ")[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen principal */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary to-[#7c3aed] text-white border-0 dark:from-[#4338ca] dark:to-[#6d28d9]">
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm/5 opacity-85">Hola, {firstName} 👋</p>
              <p className="text-sm font-medium opacity-90">Gastado · {period.label}</p>
            </div>
            <ComparisonPill comparison={comparison} inverted />
          </div>
          <p className="text-4xl font-bold tabular tracking-tight sm:text-5xl">{formatMoney(summary.total)}</p>
          <div className="grid grid-cols-3 gap-2 text-white/95">
            <MiniStat label="Transacciones" value={String(summary.count)} />
            <MiniStat label="Promedio" value={formatMoney(summary.average, { compact: true })} />
            <MiniStat label="Mayor gasto" value={formatMoney(summary.max, { compact: true })} />
          </div>
          <div className="flex gap-2 pt-1">
            <Link
              href="/gastos/nuevo/uber"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-black/85 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              <Car className="h-4 w-4" /> + Uber
            </Link>
            <Link
              href="/gastos/nuevo"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/20 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Gasto
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Uber */}
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-uber text-background">
                  <Car className="h-4 w-4" />
                </span>
                Uber
              </span>
            }
            subtitle={period.label}
            action={
              <Link href="/estadisticas?tab=uber" className="text-sm font-medium text-primary hover:underline">
                Ver más
              </Link>
            }
          />
          <CardBody className="flex flex-col gap-3 pt-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold tabular tracking-tight">{formatMoney(uber.total)}</p>
                <p className="text-sm text-muted">
                  {uber.count} viaje{uber.count === 1 ? "" : "s"} · promedio {formatMoney(uber.average)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular">{formatPercent(uber.percentOfTotal, 0)}</p>
                <p className="text-xs text-muted">del total</p>
              </div>
            </div>
            <SparkArea
              data={data.uberSeries.map((p) => ({
                key: p.key,
                label: seriesLabel(p.key, data.uberSeries.length && p.key.length === 7 ? "month" : "day"),
                total: p.total,
                count: p.count,
              }))}
              color="var(--uber)"
            />
            <ComparisonLine label="vs. período anterior" comparison={compareNum(uber.total, data.uberPrevious.total)} />
          </CardBody>
        </Card>

        {/* Comparacion mensual */}
        <Card>
          <CardHeader title="Este mes vs. mes anterior" subtitle="Comparación automática" />
          <CardBody className="flex flex-col gap-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="text-xs text-muted">{monthLabel(monthComparison.currentLabel)}</p>
                <p className="mt-1 text-xl font-bold tabular">{formatMoney(monthComparison.current)}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="text-xs text-muted">{monthLabel(monthComparison.previousLabel)}</p>
                <p className="mt-1 text-xl font-bold tabular">{formatMoney(monthComparison.previous)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Diferencia</p>
                <p className={cn("text-lg font-semibold tabular", toneClass(monthComparison.comparison.diff))}>
                  {formatMoneyDiff(monthComparison.comparison.diff)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Variación</p>
                <ComparisonPill comparison={monthComparison.comparison} />
              </div>
            </div>
            <Progress
              value={monthComparison.previous > 0 ? (monthComparison.current / monthComparison.previous) * 100 : monthComparison.current > 0 ? 100 : 0}
              tone={monthComparison.current > monthComparison.previous ? "warning" : "success"}
              label="Progreso respecto al mes anterior"
            />
          </CardBody>
        </Card>
      </div>

      {/* Presupuesto */}
      {budgets.general || budgets.categories.length ? (
        <Card>
          <CardHeader
            title="Presupuesto"
            subtitle={formatMonthYear(budgets.year, budgets.month)}
            action={
              <Link href="/presupuesto" className="text-sm font-medium text-primary hover:underline">
                Gestionar
              </Link>
            }
          />
          <CardBody className="flex flex-col gap-4 pt-3">
            {budgets.general ? (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium">General</span>
                  <span className="tabular text-muted">
                    <span className={cn("font-semibold", budgets.general.exceeded ? "text-danger" : "text-foreground")}>{formatMoney(budgets.general.spent)}</span> /{" "}
                    {formatMoney(budgets.general.amount)}
                  </span>
                </div>
                <Progress value={budgets.general.percent} tone={budgets.general.exceeded ? "danger" : budgets.general.warning ? "warning" : "primary"} />
                <p className={cn("mt-1 text-xs", budgets.general.exceeded ? "text-danger font-medium" : "text-muted")}>
                  {budgets.general.exceeded
                    ? `Superaste el presupuesto por ${formatMoney(-budgets.general.remaining)}`
                    : `Disponible: ${formatMoney(budgets.general.remaining)}`}
                </p>
              </div>
            ) : null}
            {budgets.categories.slice(0, 3).map((b) => (
              <div key={b.budgetId}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium">
                    {b.categoryIcon} {b.categoryName}
                  </span>
                  <span className="tabular text-muted">
                    <span className={cn("font-semibold", b.exceeded ? "text-danger" : "text-foreground")}>{formatMoney(b.spent)}</span> / {formatMoney(b.amount)}
                  </span>
                </div>
                <Progress value={b.percent} tone={b.exceeded ? "danger" : b.warning ? "warning" : "primary"} />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top categorias */}
        <Card>
          <CardHeader
            title="Principales categorías"
            subtitle={period.label}
            action={
              <Link href="/estadisticas" className="text-sm font-medium text-primary hover:underline">
                Estadísticas
              </Link>
            }
          />
          <CardBody className="pt-3">
            {byCategory.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Sin gastos en este período.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {byCategory.map((c) => (
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
            )}
          </CardBody>
        </Card>

        {/* Ultimos gastos */}
        <Card>
          <CardHeader
            title="Últimos gastos"
            subtitle={period.label}
            action={
              <Link href="/gastos" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                Ver todos <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
          <CardBody className="pt-2">
            {recent.length === 0 ? (
              <EmptyState
                icon="🧾"
                title={hasData ? "Sin gastos recientes" : "Todavía no registraste gastos"}
                description={hasData ? undefined : "Tocá + para agregar el primero."}
                className="py-6"
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((e) => (
                  <li key={e.id}>
                    <Link href={`/gastos/${e.id}`} className="flex items-center gap-3 py-2.5 hover:bg-surface-2 -mx-2 px-2 rounded-xl">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${e.categoryColor}1f` }} aria-hidden>
                        {e.categoryIcon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.description || e.categoryName}</span>
                        <span className="block text-xs text-muted">
                          {formatDateHuman(e.date, { today })}
                          {e.time ? ` · ${e.time}` : ""} · {e.paymentMethodName}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular">{formatMoney(e.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] opacity-85">{label}</p>
      <p className="truncate text-base font-semibold tabular">{value}</p>
    </div>
  );
}

function monthLabel(iso: string): string {
  const { year, month } = parseISO(iso);
  return formatMonthYear(year, month);
}

function compareNum(current: number, previous: number): Comparison {
  const diff = Math.round((current - previous) * 100) / 100;
  return { current, previous, diff, percent: previous > 0 ? Math.round((diff / previous) * 1000) / 10 : null };
}

function toneClass(diff: number): string {
  if (diff > 0) return "text-danger";
  if (diff < 0) return "text-success";
  return "text-muted";
}

/** Chip con variacion porcentual. Gastar mas = rojo, gastar menos = verde. */
export function ComparisonPill({ comparison, inverted }: { comparison: Comparison; inverted?: boolean }) {
  const { diff, percent } = comparison;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const text = percent === null ? (diff > 0 ? "Nuevo" : "—") : `${diff > 0 ? "+" : ""}${formatPercent(percent)}`;
  const tone = diff > 0 ? "danger" : diff < 0 ? "success" : "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular",
        inverted
          ? "bg-white/20 text-white"
          : tone === "danger"
            ? "bg-danger-soft text-danger"
            : tone === "success"
              ? "bg-success-soft text-success"
              : "bg-surface-2 text-muted",
      )}
      title="Variación respecto al período anterior"
    >
      <Icon className="h-3.5 w-3.5" /> {text}
    </span>
  );
}

function ComparisonLine({ label, comparison }: { label: string; comparison: Comparison }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted">
      <span>{label}</span>
      <span className="inline-flex items-center gap-2">
        <span className={cn("font-medium tabular", toneClass(comparison.diff))}>{formatMoneyDiff(comparison.diff)}</span>
        <ComparisonPill comparison={comparison} />
      </span>
    </div>
  );
}
