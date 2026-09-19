import { requireUser } from "@/lib/auth/current-user";
import { getPaymentMethods } from "@/lib/queries/expenses";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogManager } from "@/components/settings/catalog-manager";

export const metadata = { title: "Metodos de pago" };

export default async function PaymentMethodsSettingsPage() {
  const user = await requireUser();
  const methods = await getPaymentMethods(user.id);
  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader title="Métodos de pago" subtitle="Efectivo, tarjetas, billeteras" backHref="/configuracion" />
      <CatalogManager kind="payment" items={methods} />
    </div>
  );
}
