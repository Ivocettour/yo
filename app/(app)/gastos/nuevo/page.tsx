import { requireUser } from "@/lib/auth/current-user";
import { getCategories, getPaymentMethods } from "@/lib/queries/expenses";
import { isISODate, nowTimeInTimezone, todayInTimezone } from "@/lib/utils/dates";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, CardBody } from "@/components/ui/card";

export const metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage({ searchParams }: PageProps<"/gastos/nuevo">) {
  const user = await requireUser();
  const params = await searchParams;
  const [categories, paymentMethods] = await Promise.all([
    getCategories(user.id, { activeOnly: true }),
    getPaymentMethods(user.id, { activeOnly: true }),
  ]);
  const categoryParam = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const defaultCategoryId = categories.find((c) => c.id === categoryParam)?.id;
  const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
  const today = todayInTimezone(user.timezone);
  const defaultDate = isISODate(dateParam) ? dateParam : today;

  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader title="Nuevo gasto" backHref="/" />
      <Card>
        <CardBody>
          <ExpenseForm
            categories={categories}
            paymentMethods={paymentMethods}
            today={defaultDate}
            nowTime={nowTimeInTimezone(user.timezone)}
            defaultCategoryId={defaultCategoryId}
          />
        </CardBody>
      </Card>
    </div>
  );
}
