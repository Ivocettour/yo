import { z } from "zod";
import { amountSchema, monthSchema, yearSchema } from "./common";

export const budgetSchema = z.object({
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  amount: amountSchema,
  month: monthSchema,
  year: yearSchema,
});

export type BudgetInput = z.infer<typeof budgetSchema>;
