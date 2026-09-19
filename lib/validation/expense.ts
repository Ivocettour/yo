import { z } from "zod";
import { amountSchema, idSchema, isoDateSchema, optionalTextSchema, optionalTimeSchema } from "./common";

export const MAX_INSTALLMENTS = 60;

export const expenseInputSchema = z
  .object({
    amount: amountSchema,
    categoryId: idSchema,
    paymentMethodId: idSchema,
    description: optionalTextSchema(200),
    date: isoDateSchema,
    time: optionalTimeSchema,
    notes: optionalTextSchema(1000),
    origin: optionalTextSchema(120),
    destination: optionalTextSchema(120),
    installments: z.coerce.number().int().min(1).max(MAX_INSTALLMENTS).default(1),
    installmentNumber: z.coerce.number().int().min(1).max(MAX_INSTALLMENTS).default(1),
    /** Si es true, `amount` es el total de la compra y se divide en cuotas. */
    amountIsTotal: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === "true" || v === "on"),
  })
  .refine((d) => d.installmentNumber <= d.installments, {
    message: "La cuota actual no puede ser mayor al total de cuotas.",
    path: ["installmentNumber"],
  });

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

/** Edicion de un gasto existente: no se cambian cuotas desde aqui (se editan por plan). */
export const expenseUpdateSchema = z.object({
  amount: amountSchema,
  categoryId: idSchema,
  paymentMethodId: idSchema,
  description: optionalTextSchema(200),
  date: isoDateSchema,
  time: optionalTimeSchema,
  notes: optionalTextSchema(1000),
  origin: optionalTextSchema(120),
  destination: optionalTextSchema(120),
});

export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;

export const uberInputSchema = z.object({
  amount: amountSchema,
  paymentMethodId: idSchema,
  date: isoDateSchema,
  time: optionalTimeSchema,
  origin: optionalTextSchema(120),
  destination: optionalTextSchema(120),
  description: optionalTextSchema(200),
  notes: optionalTextSchema(1000),
});

export type UberInput = z.infer<typeof uberInputSchema>;
