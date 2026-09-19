import { requireUser } from "@/lib/auth/current-user";
import { getCategories } from "@/lib/queries/expenses";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogManager } from "@/components/settings/catalog-manager";

export const metadata = { title: "Categorias" };

export default async function CategoriesSettingsPage() {
  const user = await requireUser();
  const categories = await getCategories(user.id);
  return (
    <div className="mx-auto max-w-xl animate-in">
      <PageHeader title="Categorías" subtitle="Se usan al registrar y filtrar gastos" backHref="/configuracion" />
      <CatalogManager kind="category" items={categories} />
    </div>
  );
}
