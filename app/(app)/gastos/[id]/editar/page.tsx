import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getCategories, getExpenseById, getPaymentMethods } from "@/lib/queries/expenses";
import { nowTimeInTimezone, todayInTimezone } from "@/lib/utils/dates";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, CardBody } from "@/components/ui/card";

export const metadata = { title: "Editar gasto" };

export default async function EditExpensePage({ params }: PageProps<"/gastos/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  const [expense, categories, paymentMethods] = await Promise.all([
    getExpenseById(user.id, id),
    getCategories(user.id),
    getPaymentMethods(user.id),
  ]);
  if (!expense) notFound();
  // Mostramos activas + la del gasto (aunque este inactiva) para no perder la seleccion.
  const cats = categories.filter((c) => c.active || c.id === expense.category.id);
  const pms = paymentMethods.filter((m) => m.active || m.id === expense.paymentMethod.id);

  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader title="Editar gasto" backHref={`/gastos/${expense.id}`} />
      <Card>
        <CardBody>
          <ExpenseForm
            categories={cats}
            paymentMethods={pms}
            today={todayInTimezone(user.timezone)}
            nowTime={nowTimeInTimezone(user.timezone)}
            expense={expense}
          />
        </CardBody>
      </Card>
    </div>
  );
}
