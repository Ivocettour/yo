import { z } from "zod";
import { isISODate, isValidTime } from "@/lib/utils/dates";
import { parseAmountInput } from "@/lib/utils/money";

export const MAX_AMOUNT = 999_999_999;

/** Monto: acepta string en formato argentino o number. Debe ser > 0. */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = parseAmountInput(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Ingresá un monto válido (ej. 8500 o 8.500,50)." });
      return z.NEVER;
    }
    return n;
  })
  .refine((n) => n > 0, { message: "El monto debe ser mayor a 0." })
  .refine((n) => n <= MAX_AMOUNT, { message: "El monto es demasiado grande." });

export const isoDateSchema = z
  .string()
  .trim()
  .refine(isISODate, { message: "Fecha inválida. Usá el formato AAAA-MM-DD." });

export const optionalTimeSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || isValidTime(v), { message: "Hora inválida (HH:mm)." })
  .transform((v) => v ?? null);

export const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Máximo ${max} caracteres.` })
    .optional()
    .transform((v) => (v ? v : null));

export const idSchema = z.string().trim().min(1, { message: "Requerido." }).max(64);

export const monthSchema = z.coerce.number().int().min(1).max(12);
export const yearSchema = z.coerce.number().int().min(2000).max(2100);

export type FieldErrors = Record<string, string>;

/** Convierte issues de Zod en un mapa campo -> mensaje. */
export function issuesToFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Convierte un FormData a objeto plano (strings), ignorando archivos. */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
