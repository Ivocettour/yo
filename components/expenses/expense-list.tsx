"use client";

import { Fragment, useState, useTransition } from "react";
import { loadMoreExpenses } from "@/lib/actions/expenses";
import type { ExpenseDTO, ExpenseFilters, ExpensePage } from "@/lib/queries/expenses";
import { formatDateHuman } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ExpenseItem } from "./expense-item";

interface ExpenseListProps {
  initial: ExpensePage;
  filters: ExpenseFilters;
  today: string;
}

/** Lista agrupada por dia con carga progresiva. */
export function ExpenseList({ initial, filters, today }: ExpenseListProps) {
  const [items, setItems] = useState<ExpenseDTO[]>(initial.items);
  const [nextPage, setNextPage] = useState<number | null>(initial.nextPage);
  const [pending, startTransition] = useTransition();
  const { error } = useToast();

  const loadMore = () => {
    if (nextPage === null) return;
    startTransition(async () => {
      const res = await loadMoreExpenses(filters, nextPage);
      if (!res.ok) {
        error(res.error);
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...res.data.items.filter((e) => !seen.has(e.id))];
      });
      setNextPage(res.data.nextPage);
    });
  };

  // Agrupamos por fecha manteniendo el orden.
  const groups: { date: string; total: number; items: ExpenseDTO[] }[] = [];
  for (const e of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) {
      last.items.push(e);
      last.total += e.amount;
    } else {
      groups.push({ date: e.date, total: e.amount, items: [e] });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => (
        <Fragment key={g.date}>
          <div className="mt-2 flex items-baseline justify-between px-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{formatDateHuman(g.date, { today })}</h3>
            <span className="text-xs font-medium tabular text-muted">{formatMoney(g.total)}</span>
          </div>
          <div className="divide-y divide-border/60 rounded-3xl bg-surface shadow-card border border-border/60 px-2">
            {g.items.map((e) => (
              <ExpenseItem key={e.id} expense={e} showDate={false} />
            ))}
          </div>
        </Fragment>
      ))}
      {nextPage !== null ? (
        <div className="flex justify-center pt-3">
          <Button variant="outline" onClick={loadMore} loading={pending}>
            Cargar más
          </Button>
        </div>
      ) : items.length > 0 ? (
        <p className="pt-3 text-center text-xs text-muted">
          {items.length} de {initial.total} gasto{initial.total === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
