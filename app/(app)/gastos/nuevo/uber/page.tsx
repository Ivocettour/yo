import { Car } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getPaymentMethods } from "@/lib/queries/expenses";
import { nowTimeInTimezone, todayInTimezone } from "@/lib/utils/dates";
import { UBER_CATEGORY_KEY } from "@/lib/utils/stats";
import { PageHeader } from "@/components/layout/page-header";
import { UberForm } from "@/components/expenses/uber-form";
import { Card, CardBody } from "@/components/ui/card";

export const metadata = { title: "Nuevo viaje en Uber" };

export default async function NewUberPage() {
  const user = await requireUser();
  const [paymentMethods, recent] = await Promise.all([
    getPaymentMethods(user.id, { activeOnly: true }),
    prisma.expense.findMany({
      where: { userId: user.id, category: { key: UBER_CATEGORY_KEY } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { origin: true, destination: true, paymentMethodId: true },
    }),
  ]);
  const places = [...new Set(recent.flatMap((r) => [r.origin, r.destination]).filter((p): p is string => Boolean(p)))].slice(0, 10);
  const lastPm = recent[0]?.paymentMethodId ?? null;

  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Car className="h-6 w-6" /> Viaje en Uber
          </span>
        }
        subtitle="Carga rápida: monto, trayecto y listo."
        backHref="/"
      />
      <Card>
        <CardBody>
          <UberForm
            paymentMethods={paymentMethods}
            today={todayInTimezone(user.timezone)}
            nowTime={nowTimeInTimezone(user.timezone)}
            lastPaymentMethodId={paymentMethods.some((m) => m.id === lastPm) ? lastPm : null}
            recentPlaces={places}
          />
        </CardBody>
      </Card>
    </div>
  );
}
