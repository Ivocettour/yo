"use client";

import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils/cn";

/** Formatea "8500.5" -> "8.500,5" mientras se escribe. */
export function formatAmountForInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const [intPartRaw, ...rest] = cleaned.split(",");
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (rest.length === 0) return grouped;
  const dec = rest.join("").slice(0, 2);
  return `${grouped},${dec}`;
}

export function numberToInputAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const fixed = Math.round(value * 100) % 100 === 0 ? String(Math.round(value)) : value.toFixed(2);
  return formatAmountForInput(fixed.replace(".", ","));
}

interface AmountInputProps {
  name?: string;
  id?: string;
  defaultValue?: number | null;
  value?: string;
  onValueChange?: (formatted: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
  size?: "md" | "xl";
  placeholder?: string;
  required?: boolean;
}

/** Input de monto en pesos con teclado numerico y formato argentino. */
export function AmountInput({
  name = "amount",
  id = "amount",
  defaultValue,
  value,
  onValueChange,
  autoFocus,
  invalid,
  size = "xl",
  placeholder = "0",
  required,
}: AmountInputProps) {
  const [inner, setInner] = useState(() => numberToInputAmount(defaultValue));
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountForInput(e.target.value);
    if (!controlled) setInner(formatted);
    onValueChange?.(formatted);
  };

  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted",
          size === "xl" ? "text-2xl" : "text-base",
        )}
        aria-hidden
      >
        $
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        placeholder={placeholder}
        value={current}
        onChange={onChange}
        autoFocus={autoFocus}
        required={required}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-2xl border border-border bg-surface pr-4 font-semibold tabular text-foreground",
          "placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          "aria-[invalid=true]:border-danger",
          size === "xl" ? "min-h-16 pl-10 text-3xl" : "min-h-12 pl-8 text-base",
        )}
      />
    </div>
  );
}
