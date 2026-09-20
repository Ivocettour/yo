"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import type { ActionResult } from "@/lib/actions/types";
import type { CategoryDTO, ExpenseDTO, PaymentMethodDTO } from "@/lib/queries/expenses";
import { CREDIT_PAYMENT_KEY } from "@/lib/defaults";
import { UBER_CATEGORY_KEY } from "@/lib/utils/stats";
import { formatMoney, parseAmountInput, splitInstallments } from "@/lib/utils/money";
import { MAX_INSTALLMENTS } from "@/lib/validation/expense";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CategoryPicker, PaymentMethodPicker } from "./pickers";
import { useDeviceDateTimeDefaults } from "./use-device-defaults";

interface ExpenseFormProps {
  categories: CategoryDTO[];
  paymentMethods: PaymentMethodDTO[];
  today: string;
  nowTime: string;
  expense?: ExpenseDTO;
  /** Categoria preseleccionada al crear (por ejemplo desde un filtro). */
  defaultCategoryId?: string;
  returnTo?: string;
  /** Si la fecha viene fijada (por ejemplo desde el calendario) no se reemplaza por la del dispositivo. */
  fixedDate?: boolean;
}

export function ExpenseForm({ categories, paymentMethods, today, nowTime, expense, defaultCategoryId, returnTo, fixedDate }: ExpenseFormProps) {
  const router = useRouter();
  const { success } = useToast();
  const isEdit = Boolean(expense);
  const boundAction = useMemo(
    () => (expense ? updateExpense.bind(null, expense.id) : createExpense),
    [expense],
  );
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(boundAction, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const [categoryId, setCategoryId] = useState(expense?.category.id ?? defaultCategoryId ?? categories[0]?.id ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(expense?.paymentMethod.id ?? paymentMethods[0]?.id ?? "");
  const [amountText, setAmountText] = useState(() =>
    expense ? (Math.round(expense.amount * 100) % 100 === 0 ? String(Math.round(expense.amount)) : expense.amount.toFixed(2).replace(".", ",")) : "",
  );
  const [installments, setInstallments] = useState(1);
  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [amountIsTotal, setAmountIsTotal] = useState(true);
  const [showMore, setShowMore] = useState(Boolean(expense?.notes || expense?.time || expense?.origin));
  const handled = useRef(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  useDeviceDateTimeDefaults(dateRef, timeRef, !isEdit && !fixedDate);

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isCredit = selectedMethod?.key === CREDIT_PAYMENT_KEY;
  const isUberCategory = selectedCategory?.key === UBER_CATEGORY_KEY;
  const showInstallments = !isEdit && isCredit;

  const amountNumber = parseAmountInput(amountText) ?? 0;
  const installmentPreview =
    showInstallments && installments > 1 && amountNumber > 0
      ? amountIsTotal
        ? splitInstallments(amountNumber, installments)[0]
        : amountNumber
      : null;
  const totalPreview =
    showInstallments && installments > 1 && amountNumber > 0 ? (amountIsTotal ? amountNumber : amountNumber * installments) : null;

  useEffect(() => {
    if (state?.ok && !handled.current) {
      handled.current = true;
      success(state.message ?? (isEdit ? "Gasto actualizado." : "Gasto registrado."));
      router.push(returnTo ?? (isEdit ? `/gastos/${state.data.id}` : "/"));
      router.refresh();
    }
  }, [state, success, router, isEdit, returnTo]);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormError message={state && !state.ok && !Object.keys(errors).length ? state.error : null} />

      <Field label="Monto" htmlFor="amount" error={errors.amount} required>
        <AmountInput
          id="amount"
          name="amount"
          value={amountText}
          onValueChange={setAmountText}
          autoFocus={!isEdit}
          invalid={Boolean(errors.amount)}
          required
        />
      </Field>

      <Field label="Categoría" error={errors.categoryId} required>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} invalid={Boolean(errors.categoryId)} />
      </Field>

      <Field label="Descripción" htmlFor="description" error={errors.description}>
        <Input
          id="description"
          name="description"
          placeholder={isUberCategory ? "Uber desde facultad a casa" : "¿En qué gastaste?"}
          defaultValue={expense?.description ?? ""}
          maxLength={200}
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-[1.35fr_1fr] gap-3">
        <Field label="Fecha" htmlFor="date" error={errors.date} required>
          <Input ref={dateRef} id="date" name="date" type="date" defaultValue={expense?.date ?? today} required max="2100-12-31" />
        </Field>
        <Field label="Hora" htmlFor="time" error={errors.time}>
          <Input ref={timeRef} id="time" name="time" type="time" defaultValue={expense?.time ?? (isEdit ? "" : nowTime)} />
        </Field>
      </div>

      <Field label="Método de pago" error={errors.paymentMethodId} required>
        <PaymentMethodPicker methods={paymentMethods} value={paymentMethodId} onChange={setPaymentMethodId} invalid={Boolean(errors.paymentMethodId)} />
      </Field>

      {showInstallments ? (
        <div className="rounded-2xl border border-border bg-surface-2/60 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold">Cuotas</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad de cuotas" htmlFor="installments" error={errors.installments}>
              <Input
                id="installments"
                name="installments"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_INSTALLMENTS}
                value={installments}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(MAX_INSTALLMENTS, Number(e.target.value) || 1));
                  setInstallments(n);
                  if (installmentNumber > n) setInstallmentNumber(n);
                }}
              />
            </Field>
            <Field label="Cuota actual" htmlFor="installmentNumber" error={errors.installmentNumber}>
              <Input
                id="installmentNumber"
                name="installmentNumber"
                type="number"
                inputMode="numeric"
                min={1}
                max={installments}
                value={installmentNumber}
                onChange={(e) => setInstallmentNumber(Math.max(1, Math.min(installments, Number(e.target.value) || 1)))}
                disabled={installments <= 1}
              />
            </Field>
          </div>
          {installments > 1 ? (
            <>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="amountIsTotal"
                  value="true"
                  checked={amountIsTotal}
                  onChange={(e) => setAmountIsTotal(e.target.checked)}
                  className="h-5 w-5 rounded accent-[var(--primary)]"
                />
                El monto ingresado es el total de la compra
              </label>
              {installmentPreview !== null && totalPreview !== null ? (
                <p className="text-sm text-muted">
                  {installments} cuotas de <span className="font-semibold text-foreground">{formatMoney(installmentPreview)}</span> · Total{" "}
                  <span className="font-semibold text-foreground">{formatMoney(totalPreview)}</span>. Se registra una cuota por mes desde la cuota{" "}
                  {installmentNumber}.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {isEdit && expense && expense.installments > 1 ? (
        <p className="text-xs text-muted">
          Este gasto es la cuota {expense.installmentNumber} de {expense.installments}. Editás solo esta cuota.
        </p>
      ) : null}

      {!showMore ? (
        <button type="button" onClick={() => setShowMore(true)} className="self-start text-sm font-medium text-primary hover:underline">
          + Agregar origen/destino y notas
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origen" htmlFor="origin" error={errors.origin}>
              <Input id="origin" name="origin" placeholder="Facultad" defaultValue={expense?.origin ?? ""} maxLength={120} />
            </Field>
            <Field label="Destino" htmlFor="destination" error={errors.destination}>
              <Input id="destination" name="destination" placeholder="Casa" defaultValue={expense?.destination ?? ""} maxLength={120} />
            </Field>
          </div>
          <Field label="Notas" htmlFor="notes" error={errors.notes}>
            <Textarea id="notes" name="notes" placeholder="Detalles adicionales" defaultValue={expense?.notes ?? ""} maxLength={1000} />
          </Field>
        </>
      )}

      <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.5rem)] z-10 -mx-1 flex gap-2 rounded-2xl bg-background/80 p-1 backdrop-blur lg:static lg:bg-transparent lg:p-0">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={pending} className="flex-[2]">
          {isEdit ? "Guardar cambios" : "Guardar gasto"}
        </Button>
      </div>
    </form>
  );
}
