import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getExpenseById } from "@/lib/queries/expenses";
import { formatDateHuman, todayInTimezone } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";

export const metadata = { title: "Detalle del gasto" };

export default async function ExpenseDetailPage({ params }: PageProps<"/gastos/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const expense = await getExpenseById(user.id, id);
  if (!expense) notFound();
  const today = todayInTimezone(user.timezone);

  const rows: { label: string; value: string | null }[] = [
    { label: "Categoría", value: `${expense.category.icon} ${expense.category.name}` },
    { label: "Fecha", value: `${formatDateHuman(expense.date, { long: true })}${expense.time ? ` · ${expense.time}` : ""}` },
    { label: "Método de pago", value: `${expense.paymentMethod.icon} ${expense.paymentMethod.name}` },
    { label: "Origen", value: expense.origin },
    { label: "Destino", value: expense.destination },
    { label: "Notas", value: expense.notes },
  ];

  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader title="Detalle" backHref="/gastos" />
      <Card>
        <CardBody className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl text-3xl"
              style={{ backgroundColor: `${expense.category.color}1f` }}
              aria-hidden
            >
              {expense.category.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold leading-tight">{expense.description || expense.category.name}</p>
              <p className="text-sm text-muted">{formatDateHuman(expense.date, { today })}</p>
            </div>
          </div>
          <p className="text-4xl font-bold tabular tracking-tight">{formatMoney(expense.amount)}</p>
          {expense.installments > 1 ? (
            <Badge tone="primary" className="self-start">
              Cuota {expense.installmentNumber} de {expense.installments}
            </Badge>
          ) : null}
          <dl className="divide-y divide-border/60 rounded-2xl border border-border/60">
            {rows
              .filter((r) => r.value)
              .map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-muted">{r.label}</dt>
                  <dd className="text-right text-sm font-medium whitespace-pre-wrap">{r.value}</dd>
                </div>
              ))}
          </dl>
          <div className="flex gap-2">
            <Link
              href={`/gastos/${expense.id}/editar`}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Link>
            <DeleteExpenseButton id={expense.id} hasPlan={Boolean(expense.installmentPlanId)} installments={expense.installments} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
