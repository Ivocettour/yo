"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils/money";

const AXIS_STYLE = { fontSize: 11, fill: "var(--muted)" };

function compactMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

interface TooltipPayloadItem {
  value?: number | string;
  name?: string;
  payload?: Record<string, unknown>;
  color?: string;
}

function MoneyTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const count = item.payload?.count as number | undefined;
  const title = item.payload?.name ?? (labelFormatter && label !== undefined ? labelFormatter(String(label)) : label);
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-float">
      <p className="font-medium text-muted">{String(title ?? "")}</p>
      <p className="text-sm font-semibold tabular">{formatMoney(Number(item.value ?? 0))}</p>
      {count !== undefined ? <p className="text-muted">{count} gasto{count === 1 ? "" : "s"}</p> : null}
    </div>
  );
}

export interface SeriesDatum {
  key: string;
  label: string;
  total: number;
  count: number;
}

/** Area chart pequeno para tarjetas (sin ejes). */
export function SparkArea({ data, color = "var(--primary)", height = 64 }: { data: SeriesDatum[]; color?: string; height?: number }) {
  if (!data.some((d) => d.total > 0)) {
    return <div className="flex items-center justify-center text-xs text-muted" style={{ height }}>Sin datos</div>;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<MoneyTooltip labelFormatter={(l) => data.find((d) => d.key === l)?.label ?? l} />} />
          <XAxis dataKey="key" hide />
          <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill="url(#spark-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolutionChart({ data, height = 240 }: { data: SeriesDatum[]; height?: number }) {
  if (!data.some((d) => d.total > 0)) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>Sin gastos en este período</div>;
  }
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="key"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            interval={tickEvery - 1}
            tickFormatter={(k: string) => data.find((d) => d.key === k)?.label ?? k}
          />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44} tickFormatter={compactMoney} />
          <Tooltip content={<MoneyTooltip labelFormatter={(l) => data.find((d) => d.key === l)?.label ?? l} />} />
          <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5} dot={data.length <= 31} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface DonutDatum {
  id: string;
  name: string;
  total: number;
  color: string;
  percent: number;
}

export function DonutChart({ data, height = 220, centerLabel, centerValue }: { data: DonutDatum[]; height?: number; centerLabel?: string; centerValue?: string }) {
  if (!data.length) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>Sin datos</div>;
  }
  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<MoneyTooltip />} />
          <Pie data={data} dataKey="total" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-wide text-muted">{centerLabel}</span>
          <span className="text-lg font-bold tabular">{centerValue}</span>
        </div>
      ) : null}
    </div>
  );
}

export interface BarDatum {
  id: string;
  name: string;
  total: number;
  count?: number;
  color?: string;
}

export function BarsChart({ data, height = 200, color = "var(--primary)", horizontal }: { data: BarDatum[]; height?: number; color?: string; horizontal?: boolean }) {
  if (!data.some((d) => d.total > 0)) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>Sin datos</div>;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 8 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={compactMoney} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={90} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44} tickFormatter={compactMoney} />
            </>
          )}
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="total" radius={[8, 8, 8, 8]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
