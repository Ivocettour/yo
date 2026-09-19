"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CategoryDTO, ExpenseFilters, PaymentMethodDTO } from "@/lib/queries/expenses";
import { resolvePeriod, type PeriodKey } from "@/lib/utils/periods";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { AmountInput } from "@/components/ui/amount-input";

interface FiltersBarProps {
  filters: ExpenseFilters;
  categories: CategoryDTO[];
  paymentMethods: PaymentMethodDTO[];
  today: string;
}

const QUICK: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "last-month", label: "Mes anterior" },
];

export function FiltersBar({ filters, categories, paymentMethods, today }: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(filters.q ?? "");

  const apply = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  // Busqueda con debounce.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => apply({ q: q || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeQuick = QUICK.find((p) => {
    const r = resolvePeriod(p.key, today);
    return r.from === filters.from && r.to === filters.to;
  })?.key;

  const activeCount = [filters.from || filters.to, filters.categoryId, filters.paymentMethodId, filters.minAmount !== undefined || filters.maxAmount !== undefined].filter(Boolean).length;

  const clearAll = () => {
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por descripción, categoría, notas…"
            aria-label="Buscar gastos"
            className="pl-10"
            enterKeyHint="search"
          />
        </div>
        <Button
          variant={activeCount ? "primary" : "outline"}
          size="icon"
          className="h-12 w-12 shrink-0"
          onClick={() => setOpen(true)}
          aria-label={`Filtros${activeCount ? ` (${activeCount} activos)` : ""}`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeCount ? <span className="sr-only">{activeCount} filtros activos</span> : null}
        </Button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        {QUICK.map((p) => {
          const active = activeQuick === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                if (active) {
                  apply({ from: undefined, to: undefined });
                } else {
                  const r = resolvePeriod(p.key, today);
                  apply({ from: r.from, to: r.to });
                }
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
        {activeCount || filters.q ? (
          <button
            type="button"
            onClick={clearAll}
            className="flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-danger"
          >
            <X className="h-4 w-4" /> Limpiar
          </button>
        ) : null}
      </div>

      {pending ? <p className="text-xs text-muted">Actualizando…</p> : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="Filtros">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            apply({
              from: String(fd.get("from") || "") || undefined,
              to: String(fd.get("to") || "") || undefined,
              categoryId: String(fd.get("categoryId") || "") || undefined,
              paymentMethodId: String(fd.get("paymentMethodId") || "") || undefined,
              minAmount: String(fd.get("minAmount") || "") || undefined,
              maxAmount: String(fd.get("maxAmount") || "") || undefined,
            });
            setOpen(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" htmlFor="f-from">
              <Input id="f-from" name="from" type="date" defaultValue={filters.from ?? ""} />
            </Field>
            <Field label="Hasta" htmlFor="f-to">
              <Input id="f-to" name="to" type="date" defaultValue={filters.to ?? ""} />
            </Field>
          </div>
          <Field label="Categoría" htmlFor="f-cat">
            <Select id="f-cat" name="categoryId" defaultValue={filters.categoryId ?? ""}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                  {!c.active ? " (inactiva)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Método de pago" htmlFor="f-pm">
            <Select id="f-pm" name="paymentMethodId" defaultValue={filters.paymentMethodId ?? ""}>
              <option value="">Todos</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto mínimo" htmlFor="f-min">
              <AmountInput id="f-min" name="minAmount" size="md" defaultValue={filters.minAmount ?? null} placeholder="0" />
            </Field>
            <Field label="Monto máximo" htmlFor="f-max">
              <AmountInput id="f-max" name="maxAmount" size="md" defaultValue={filters.maxAmount ?? null} placeholder="Sin límite" />
            </Field>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                clearAll();
              }}
            >
              Limpiar
            </Button>
            <Button type="submit" className="flex-[2]">
              Aplicar filtros
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

