import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { DataManager } from "@/components/settings/data-manager";

export const metadata = { title: "Datos" };

export default async function DataSettingsPage() {
  const user = await requireUser();
  const count = await prisma.expense.count({ where: { userId: user.id } });
  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader title="Datos" subtitle="Exportar e importar backups" backHref="/configuracion" />
      <DataManager expenseCount={count} />
    </div>
  );
}
