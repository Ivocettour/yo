"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { createUberExpense } from "@/lib/actions/expenses";
import type { ActionResult } from "@/lib/actions/types";
import type { PaymentMethodDTO } from "@/lib/queries/expenses";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { PaymentMethodPicker } from "./pickers";
import { useDeviceDateTimeDefaults } from "./use-device-defaults";

interface UberFormProps {
  paymentMethods: PaymentMethodDTO[];
  today: string;
  nowTime: string;
  /** Ultimo metodo usado en Uber, para preseleccionar. */
  lastPaymentMethodId?: string | null;
  /** Ultimos lugares usados para sugerir. */
  recentPlaces: string[];
}

export function UberForm({ paymentMethods, today, nowTime, lastPaymentMethodId, recentPlaces }: UberFormProps) {
  const router = useRouter();
  const { success } = useToast();
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(createUberExpense, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const [paymentMethodId, setPaymentMethodId] = useState(lastPaymentMethodId ?? paymentMethods[0]?.id ?? "");
  const [showMore, setShowMore] = useState(false);
  const handled = useRef(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  useDeviceDateTimeDefaults(dateRef, timeRef, true);

  useEffect(() => {
    if (state?.ok && !handled.current) {
      handled.current = true;
      success(state.message ?? "Viaje en Uber registrado.");
      router.push("/");
      router.refresh();
    }
  }, [state, success, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormError message={state && !state.ok && !Object.keys(errors).length ? state.error : null} />

      <Field label="Monto del viaje" htmlFor="amount" error={errors.amount} required>
        <AmountInput id="amount" name="amount" autoFocus invalid={Boolean(errors.amount)} required />
      </Field>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label="Origen" htmlFor="origin" error={errors.origin}>
          <Input id="origin" name="origin" placeholder="Facultad" maxLength={120} list="uber-places" autoComplete="off" />
        </Field>
        <ArrowRight className="mb-3.5 h-5 w-5 text-muted" aria-hidden />
        <Field label="Destino" htmlFor="destination" error={errors.destination}>
          <Input id="destination" name="destination" placeholder="Casa" maxLength={120} list="uber-places" autoComplete="off" />
        </Field>
      </div>
      {recentPlaces.length ? (
        <datalist id="uber-places">
          {recentPlaces.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      ) : null}

      <div className="grid grid-cols-[1.35fr_1fr] gap-3">
        <Field label="Fecha" htmlFor="date" error={errors.date} required>
          <Input ref={dateRef} id="date" name="date" type="date" defaultValue={today} required max="2100-12-31" />
        </Field>
        <Field label="Hora" htmlFor="time" error={errors.time}>
          <Input ref={timeRef} id="time" name="time" type="time" defaultValue={nowTime} />
        </Field>
      </div>

      <Field label="Método de pago" error={errors.paymentMethodId} required>
        <PaymentMethodPicker methods={paymentMethods} value={paymentMethodId} onChange={setPaymentMethodId} invalid={Boolean(errors.paymentMethodId)} />
      </Field>

      {!showMore ? (
        <button type="button" onClick={() => setShowMore(true)} className="self-start text-sm font-medium text-primary hover:underline">
          + Descripción y notas
        </button>
      ) : (
        <>
          <Field label="Descripción" htmlFor="description" error={errors.description} hint="Si la dejás vacía se usa “Origen → Destino”.">
            <Input id="description" name="description" placeholder="Uber a la facultad" maxLength={200} />
          </Field>
          <Field label="Notas" htmlFor="notes" error={errors.notes}>
            <Textarea id="notes" name="notes" maxLength={1000} />
          </Field>
        </>
      )}

      <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.5rem)] z-10 -mx-1 flex gap-2 rounded-2xl bg-background/80 p-1 backdrop-blur lg:static lg:bg-transparent lg:p-0">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" variant="uber" size="lg" loading={pending} className="flex-[2]">
          Guardar viaje
        </Button>
      </div>
    </form>
  );
}
