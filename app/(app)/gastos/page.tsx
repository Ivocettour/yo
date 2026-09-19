import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getCategories, getFilteredTotals, getPaymentMethods, listExpenses } from "@/lib/queries/expenses";
import { todayInTimezone } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { hasActiveFilters, parseFilters } from "@/lib/validation/filters";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseList } from "@/components/expenses/expense-list";
import { FiltersBar } from "@/components/expenses/filters-bar";

export const metadata = { title: "Gastos" };

export default async function ExpensesPage({ searchParams }: PageProps<"/gastos">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const today = todayInTimezone(user.timezone);
  const [page, totals, categories, paymentMethods] = await Promise.all([
    listExpenses(user.id, filters),
    getFilteredTotals(user.id, filters),
    getCategories(user.id),
    getPaymentMethods(user.id),
  ]);
  const filtered = hasActiveFilters(filters);

  return (
    <div className="animate-in">
      <PageHeader
        title="Gastos"
        subtitle={`${totals.count} transacci${totals.count === 1 ? "ón" : "ones"} · ${formatMoney(totals.total)}`}
        action={
          <Link
            href="/gastos/nuevo"
            className="hidden h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground sm:inline-flex"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </Link>
        }
      />
      <Suspense>
        <FiltersBar filters={filters} categories={categories} paymentMethods={paymentMethods} today={today} />
      </Suspense>

      {filtered && totals.count > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Total" value={formatMoney(totals.total)} />
          <Stat label="Promedio" value={formatMoney(totals.average)} />
          <Stat label="Mayor" value={formatMoney(totals.max)} />
        </div>
      ) : null}

      <div className="mt-4">
        {page.items.length === 0 ? (
          <EmptyState
            icon="🧾"
            title={filtered ? "No hay gastos con esos filtros" : "Todavía no registraste gastos"}
            description={filtered ? "Probá cambiando la búsqueda o los filtros." : "Tocá + para agregar el primero."}
            action={
              !filtered ? (
                <Link
                  href="/gastos/nuevo"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Registrar gasto
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ExpenseList key={JSON.stringify(filters)} initial={page} filters={filters} today={today} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5 shadow-card border border-border/60">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-sm font-semibold tabular">{value}</p>
    </div>
  );
}
