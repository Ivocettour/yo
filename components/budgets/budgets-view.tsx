"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { copyBudgetsFromPreviousMonth, deleteBudget, upsertBudget } from "@/lib/actions/budgets";
import type { ActionResult } from "@/lib/actions/types";
import type { BudgetItemProgress, BudgetProgress, InstallmentPlanDTO } from "@/lib/queries/budgets";
import type { CategoryDTO } from "@/lib/queries/expenses";
import { formatDateShort, formatMonthYear } from "@/lib/utils/dates";
import { formatMoney, formatPercent } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

interface BudgetsViewProps {
  progress: BudgetProgress;
  categories: CategoryDTO[];
  plans: InstallmentPlanDTO[];
  isCurrentMonth: boolean;
}

export function BudgetsView({ progress, categories, plans, isCurrentMonth }: BudgetsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { success, error } = useToast();
  const [editing, setEditing] = useState<{ categoryId: string | null; amount: number | null } | null>(null);
  const [deleting, setDeleting] = useState<BudgetItemProgress | null>(null);

  const { year, month } = progress;
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const goTo = (y: number, m: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    params.set("month", String(m));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const withBudget = new Set(progress.categories.map((c) => c.categoryId));
  const available = categories.filter((c) => c.active && !withBudget.has(c.id));

  const copyPrev = () => {
    startTransition(async () => {
      const res = await copyBudgetsFromPreviousMonth(year, month);
      if (res.ok) success(res.message ?? "Presupuestos copiados.");
      else error(res.error);
    });
  };

  const confirmDelete = () => {
    if (!deleting?.budgetId) return;
    startTransition(async () => {
      const res = await deleteBudget(deleting.budgetId!);
      if (res.ok) success(res.message ?? "Presupuesto eliminado.");
      else error(res.error);
      setDeleting(null);
    });
  };

  const hasAny = progress.general || progress.categories.length > 0;

  return (
    <div className={cn("flex flex-col gap-4", pending && "opacity-80")}>
      <div className="flex items-center justify-between rounded-2xl bg-surface px-2 py-1.5 shadow-card border border-border/60">
        <button type="button" onClick={() => goTo(prev.y, prev.m)} aria-label="Mes anterior" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-base font-semibold">{formatMonthYear(year, month)}</p>
        <button type="button" onClick={() => goTo(next.y, next.m)} aria-label="Mes siguiente" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* General */}
      <Card>
        <CardHeader
          title="Presupuesto general"
          subtitle={isCurrentMonth ? "Límite total del mes" : `Total de ${formatMonthYear(year, month)}`}
          action={
            <Button size="sm" variant={progress.general ? "outline" : "primary"} onClick={() => setEditing({ categoryId: null, amount: progress.general?.amount ?? null })}>
              {progress.general ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {progress.general ? "Editar" : "Definir"}
            </Button>
          }
        />
        <CardBody className="pt-3">
          {progress.general ? (
            <BudgetRow item={progress.general} onDelete={() => setDeleting(progress.general)} big />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <p className="text-sm text-muted">Sin presupuesto general. Gastado este mes:</p>
              <p className="text-base font-semibold tabular">{formatMoney(progress.totalSpent)}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Por categoria */}
      <Card>
        <CardHeader
          title="Por categoría"
          subtitle="Límite mensual para cada categoría"
          action={
            available.length ? (
              <Button size="sm" onClick={() => setEditing({ categoryId: available[0].id, amount: null })}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            ) : null
          }
        />
        <CardBody className="flex flex-col gap-5 pt-3">
          {progress.categories.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="Sin presupuestos por categoría"
              description="Definí un límite para Uber, Comida, Compras… y te avisamos cuando lo superes."
              className="py-6"
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  {available.length ? (
                    <Button onClick={() => setEditing({ categoryId: available[0].id, amount: null })}>
                      <Plus className="h-4 w-4" /> Agregar presupuesto
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={copyPrev} loading={pending}>
                    <Copy className="h-4 w-4" /> Copiar del mes anterior
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {progress.categories.map((b) => (
                <BudgetRow
                  key={b.budgetId}
                  item={b}
                  onEdit={() => setEditing({ categoryId: b.categoryId, amount: b.amount })}
                  onDelete={() => setDeleting(b)}
                />
              ))}
              {!hasAny ? null : (
                <Button variant="ghost" size="sm" className="self-start text-muted" onClick={copyPrev} loading={pending}>
                  <Copy className="h-4 w-4" /> Copiar faltantes del mes anterior
                </Button>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Cuotas */}
      {plans.length ? <PlansCard plans={plans} /> : null}

      {editing ? (
        <BudgetSheet
          open
          onClose={() => setEditing(null)}
          year={year}
          month={month}
          categories={editing.categoryId === null ? [] : categories.filter((c) => (c.active && !withBudget.has(c.id)) || c.id === editing.categoryId)}
          initialCategoryId={editing.categoryId}
          initialAmount={editing.amount}
          isGeneral={editing.categoryId === null}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar presupuesto?"
        description={deleting ? `Se quitará el límite de ${deleting.categoryName} para ${formatMonthYear(year, month)}.` : undefined}
        confirmLabel="Eliminar"
        danger
        loading={pending}
      />
    </div>
  );
}

function BudgetRow({ item, onEdit, onDelete, big }: { item: BudgetItemProgress; onEdit?: () => void; onDelete: () => void; big?: boolean }) {
  const tone = item.exceeded ? "danger" : item.warning ? "warning" : "primary";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${item.categoryColor}1f` }} aria-hidden>
          {item.categoryIcon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium">{big ? "Gastado este mes" : item.categoryName}</p>
            <p className={cn("shrink-0 tabular", big ? "text-base" : "text-sm")}>
              <span className={cn("font-semibold", item.exceeded ? "text-danger" : "")}>{formatMoney(item.spent)}</span>
              <span className="text-muted"> / {formatMoney(item.amount)}</span>
            </p>
          </div>
          <div className="mt-1.5">
            <Progress value={item.percent} tone={tone} label={`Presupuesto ${item.categoryName}`} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pl-13 text-xs">
        <p className={cn("flex items-center gap-1", item.exceeded ? "font-medium text-danger" : item.warning ? "font-medium text-warning" : "text-muted")}>
          {item.exceeded ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" /> Superado por {formatMoney(-item.remaining)} ({formatPercent(item.percent, 0)})
            </>
          ) : item.warning ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" /> Disponible: {formatMoney(item.remaining)} ({formatPercent(item.percent, 0)} usado)
            </>
          ) : (
            <>
              Disponible: {formatMoney(item.remaining)} ({formatPercent(item.percent, 0)} usado)
            </>
          )}
        </p>
        <div className="flex shrink-0 gap-1">
          {onEdit ? (
            <button type="button" onClick={onEdit} aria-label="Editar presupuesto" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          <button type="button" onClick={onDelete} aria-label="Eliminar presupuesto" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetSheet({
  open,
  onClose,
  year,
  month,
  categories,
  initialCategoryId,
  initialAmount,
  isGeneral,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  categories: CategoryDTO[];
  initialCategoryId: string | null;
  initialAmount: number | null;
  isGeneral: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(upsertBudget, null);
  const { success } = useToast();
  const handled = useRef(false);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    if (state?.ok && !handled.current) {
      handled.current = true;
      success(state.message ?? "Presupuesto guardado.");
      onClose();
    }
  }, [state, success, onClose]);

  return (
    <Sheet open={open} onClose={onClose} title={isGeneral ? "Presupuesto general" : "Presupuesto por categoría"} description={formatMonthYear(year, month)} size="sm">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        {isGeneral ? (
          <input type="hidden" name="categoryId" value="" />
        ) : (
          <Field label="Categoría" htmlFor="b-cat" error={errors.categoryId}>
            <Select id="b-cat" name="categoryId" defaultValue={initialCategoryId ?? ""}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Monto mensual" htmlFor="b-amount" error={errors.amount} required>
          <AmountInput id="b-amount" name="amount" defaultValue={initialAmount} autoFocus invalid={Boolean(errors.amount)} required />
        </Field>
        <FormError message={state && !state.ok && !Object.keys(errors).length ? state.error : null} />
        <Button type="submit" size="lg" loading={pending}>
          Guardar
        </Button>
      </form>
    </Sheet>
  );
}

function PlansCard({ plans }: { plans: InstallmentPlanDTO[] }) {
  const active = plans.filter((p) => !p.finished);
  const finished = plans.filter((p) => p.finished);
  const monthlyImpact = active.reduce((a, p) => a + p.installmentAmount, 0);
  return (
    <Card>
      <CardHeader title="Compras en cuotas" subtitle={active.length ? `Impacto mensual aproximado: ${formatMoney(monthlyImpact)}` : "Sin cuotas activas"} />
      <CardBody className="flex flex-col gap-3 pt-3">
        {[...active, ...finished].map((p) => (
          <div key={p.id} className={cn("rounded-2xl border border-border/60 p-3", p.finished && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {p.categoryIcon} {p.description}
                </p>
                <p className="text-xs text-muted">
                  {p.installments} cuotas de {formatMoney(p.installmentAmount)} · {p.paymentMethodName} · desde {formatDateShort(p.startDate)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular">{formatMoney(p.totalAmount)}</p>
            </div>
            <div className="mt-2">
              <Progress value={p.installments ? (p.paid / p.installments) * 100 : 0} tone={p.finished ? "success" : "primary"} label={`Cuotas pagadas de ${p.description}`} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {p.paid} pagada{p.paid === 1 ? "" : "s"} · {p.remaining} restante{p.remaining === 1 ? "" : "s"} ({formatMoney(p.remainingAmount)})
              {p.nextDate ? ` · próxima ${formatDateShort(p.nextDate)}` : ""}
            </p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
