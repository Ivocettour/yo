"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ExpenseDTO } from "@/lib/queries/expenses";
import { daysInMonth, formatDateHuman, formatMonthYear, makeISO, dayOfWeek } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { intensityLevel } from "@/lib/utils/stats";
import { cn } from "@/lib/utils/cn";
import { Card, CardBody } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { ExpenseItem } from "@/components/expenses/expense-item";

interface CalendarViewProps {
  year: number;
  month: number;
  days: Record<string, { total: number; count: number }>;
  max: number;
  total: number;
  today: string;
  /** Gastos del dia seleccionado (cargados en servidor). */
  selectedDay: string | null;
  selectedExpenses: ExpenseDTO[];
}

const WEEK_HEAD = ["L", "M", "M", "J", "V", "S", "D"];

const LEVEL_CLASSES = [
  "bg-surface text-foreground",
  "bg-primary/10 text-foreground",
  "bg-primary/25 text-foreground",
  "bg-primary/50 text-white",
  "bg-primary text-primary-foreground",
];

export function CalendarView({ year, month, days, max, total, today, selectedDay, selectedExpenses }: CalendarViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(Boolean(selectedDay));

  const navigate = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const count = daysInMonth(year, month);
  const firstDow = dayOfWeek(makeISO(year, month, 1));
  const leading = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (string | null)[] = [...Array(leading).fill(null), ...Array.from({ length: count }, (_, i) => makeISO(year, month, i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);

  const select = (iso: string) => {
    setOpen(true);
    navigate({ day: iso });
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ year: String(prev.y), month: String(prev.m), day: undefined })}
            aria-label="Mes anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-base font-semibold">{formatMonthYear(year, month)}</p>
            <p className="text-xs text-muted tabular">{formatMoney(total)} en el mes</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ year: String(next.y), month: String(next.m), day: undefined })}
            aria-label="Mes siguiente"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("grid grid-cols-7 gap-1 sm:gap-1.5", pending && "opacity-60")}>
          {WEEK_HEAD.map((d, i) => (
            <div key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-muted">
              {d}
            </div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e-${i}`} />;
            const info = days[iso];
            const level = intensityLevel(info?.total ?? 0, max);
            const isToday = iso === today;
            const isFuture = iso > today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => select(iso)}
                aria-label={`${formatDateHuman(iso, { long: true })}${info ? `, ${formatMoney(info.total)}` : ", sin gastos"}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-border/50 text-xs transition active:scale-95 sm:aspect-[4/3]",
                  LEVEL_CLASSES[level],
                  isToday && "ring-2 ring-primary ring-offset-1 ring-offset-surface",
                  isFuture && !info && "opacity-40",
                  selectedDay === iso && "outline outline-2 outline-foreground/60",
                )}
              >
                <span className="font-semibold leading-none">{Number(iso.slice(8))}</span>
                {info ? <span className="max-w-full truncate text-[9px] leading-none tabular sm:text-[10px]">{formatMoney(info.total, { compact: true }).replace("$ ", "$")}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-1 text-[11px] text-muted">
          Menos
          {LEVEL_CLASSES.map((c, i) => (
            <span key={i} className={cn("h-3 w-3 rounded-sm border border-border/50", c)} aria-hidden />
          ))}
          Más
        </div>
      </CardBody>

      <Sheet
        open={open && Boolean(selectedDay)}
        onClose={() => {
          setOpen(false);
          navigate({ day: undefined });
        }}
        title={selectedDay ? formatDateHuman(selectedDay, { long: true }) : ""}
        description={selectedDay && days[selectedDay] ? `${days[selectedDay].count} gasto${days[selectedDay].count === 1 ? "" : "s"} · ${formatMoney(days[selectedDay].total)}` : "Sin gastos este día"}
      >
        {selectedExpenses.length ? (
          <div className="divide-y divide-border/60 -mx-2">
            {selectedExpenses.map((e) => (
              <ExpenseItem key={e.id} expense={e} showDate={false} />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Link href={selectedDay ? `/gastos/nuevo?date=${selectedDay}` : "/gastos/nuevo"} className="text-sm font-medium text-primary hover:underline">
              Registrar un gasto
            </Link>
          </div>
        )}
      </Sheet>
    </Card>
  );
}
