import Link from "next/link";
import type { ExpenseDTO } from "@/lib/queries/expenses";
import { formatDateHuman } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

export function ExpenseItem({ expense, today, showDate = true }: { expense: ExpenseDTO; today?: string; showDate?: boolean }) {
  const e = expense;
  const title = e.description || e.category.name;
  const meta = [
    showDate ? formatDateHuman(e.date, { today }) : null,
    e.time,
    e.paymentMethod.name,
    e.installments > 1 ? `Cuota ${e.installmentNumber}/${e.installments}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/gastos/${e.id}`}
      className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
        style={{ backgroundColor: `${e.category.color}1f` }}
        aria-hidden
      >
        {e.category.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {e.description ? `${e.category.name} · ` : ""}
          {meta}
        </span>
      </span>
      <span className={cn("shrink-0 text-[15px] font-semibold tabular")}>{formatMoney(e.amount)}</span>
    </Link>
  );
}
