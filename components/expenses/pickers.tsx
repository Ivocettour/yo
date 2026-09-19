"use client";

import { cn } from "@/lib/utils/cn";
import type { CategoryDTO, PaymentMethodDTO } from "@/lib/queries/expenses";

interface CategoryPickerProps {
  categories: Pick<CategoryDTO, "id" | "name" | "icon" | "color">[];
  value: string;
  onChange: (id: string) => void;
  name?: string;
  invalid?: boolean;
}

/** Grilla de chips de categorias, con input oculto para el form. */
export function CategoryPicker({ categories, value, onChange, name = "categoryId", invalid }: CategoryPickerProps) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label="Categoría"
        aria-invalid={invalid || undefined}
        className={cn("grid grid-cols-4 gap-2 sm:grid-cols-6", invalid && "rounded-2xl ring-2 ring-danger/50 p-1")}
      >
        {categories.map((c) => {
          const active = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(c.id)}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center transition-all active:scale-95",
                active
                  ? "border-transparent bg-primary-soft text-primary ring-2 ring-primary"
                  : "border-border bg-surface text-foreground hover:bg-surface-2",
              )}
              style={active ? { boxShadow: `inset 0 0 0 2px ${c.color}` } : undefined}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {c.icon}
              </span>
              <span className="w-full truncate text-[11px] font-medium leading-tight">{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PaymentPickerProps {
  methods: Pick<PaymentMethodDTO, "id" | "name" | "icon" | "key">[];
  value: string;
  onChange: (id: string) => void;
  name?: string;
  invalid?: boolean;
}

export function PaymentMethodPicker({ methods, value, onChange, name = "paymentMethodId", invalid }: PaymentPickerProps) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label="Método de pago" className="flex flex-wrap gap-2">
        {methods.map((m) => {
          const active = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(m.id)}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95",
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface text-foreground hover:bg-surface-2",
                invalid && !value && "border-danger",
              )}
            >
              <span aria-hidden>{m.icon}</span>
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
