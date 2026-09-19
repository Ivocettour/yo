import { z } from "zod";
import { isISODate } from "@/lib/utils/dates";
import { parseAmountInput } from "@/lib/utils/money";
import type { ExpenseFilters } from "@/lib/queries/expenses";

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && isISODate(v) ? v : undefined));

const optionalId = z
  .string()
  .max(64)
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalAmount = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = parseAmountInput(v);
    return n !== null && n >= 0 ? n : undefined;
  });

export const expenseFiltersSchema = z.object({
  from: optionalDate,
  to: optionalDate,
  categoryId: optionalId,
  paymentMethodId: optionalId,
  minAmount: optionalAmount,
  maxAmount: optionalAmount,
  q: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

type SearchParamsLike = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Parsea filtros desde searchParams o desde un objeto (nunca confia en el cliente). */
export function parseFilters(input: SearchParamsLike | ExpenseFilters | null | undefined): ExpenseFilters {
  const raw: Record<string, unknown> = {};
  for (const key of ["from", "to", "categoryId", "paymentMethodId", "minAmount", "maxAmount", "q"] as const) {
    const v = (input as SearchParamsLike | undefined)?.[key];
    raw[key] = typeof v === "number" ? v : first(v as string | string[] | undefined);
  }
  const parsed = expenseFiltersSchema.safeParse(raw);
  if (!parsed.success) return {};
  const f = parsed.data;
  // Rango de montos coherente.
  if (f.minAmount !== undefined && f.maxAmount !== undefined && f.minAmount > f.maxAmount) {
    const tmp = f.minAmount;
    f.minAmount = f.maxAmount;
    f.maxAmount = tmp;
  }
  return f;
}

export function hasActiveFilters(f: ExpenseFilters): boolean {
  return Boolean(f.from || f.to || f.categoryId || f.paymentMethodId || f.minAmount !== undefined || f.maxAmount !== undefined || f.q);
}
