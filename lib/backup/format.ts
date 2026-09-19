import { z } from "zod";
import { isISODate, isValidTime } from "@/lib/utils/dates";
import { parseAmountInput } from "@/lib/utils/money";

export const BACKUP_VERSION = 1;
export const BACKUP_APP = "gastos-app";

// ---------------------------------------------------------------------------
// Estructura del backup JSON
// ---------------------------------------------------------------------------

export interface BackupExpense {
  id: string;
  amount: number;
  date: string;
  time: string | null;
  description: string | null;
  notes: string | null;
  origin: string | null;
  destination: string | null;
  category: string;
  categoryKey: string | null;
  paymentMethod: string;
  paymentMethodKey: string | null;
  installments: number;
  installmentNumber: number;
  installmentPlanId: string | null;
  createdAt: string;
}

export interface BackupPlan {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  startDate: string;
  category: string;
  paymentMethod: string;
  notes: string | null;
}

export interface BackupBudget {
  id: string;
  category: string | null;
  amount: number;
  month: number;
  year: number;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  user: { email: string; name: string };
  categories: { id: string; name: string; key: string | null; icon: string; color: string; active: boolean }[];
  paymentMethods: { id: string; name: string; key: string | null; icon: string; active: boolean }[];
  installmentPlans: BackupPlan[];
  expenses: BackupExpense[];
  budgets: BackupBudget[];
}

// ---------------------------------------------------------------------------
// Validacion de importacion
// ---------------------------------------------------------------------------

const amount = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const n = parseAmountInput(v);
  if (n === null || n <= 0) {
    ctx.addIssue({ code: "custom", message: "Monto inválido" });
    return z.NEVER;
  }
  return n;
});

const nullableText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null));

const dateField = z.string().trim().refine(isISODate, { message: "Fecha inválida" });

const timeField = z
  .union([z.string(), z.null()])
    .optional()
  .transform((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 5) : null))
  .refine((v) => v === null || isValidTime(v), { message: "Hora inválida" });

export const importExpenseSchema = z.object({
  id: z.union([z.string(), z.null()]).optional().transform((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 64) : null)),
  amount,
  date: dateField,
  time: timeField,
  description: nullableText(200),
  notes: nullableText(1000),
  origin: nullableText(120),
  destination: nullableText(120),
  category: z.string().trim().min(1, { message: "Categoría requerida" }).max(40),
  categoryKey: nullableText(40),
  paymentMethod: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : "Otro")),
  paymentMethodKey: nullableText(40),
  installments: z.coerce.number().int().min(1).max(60).catch(1),
  installmentNumber: z.coerce.number().int().min(1).max(60).catch(1),
  installmentPlanId: nullableText(64),
});

export type ImportExpense = z.infer<typeof importExpenseSchema>;

export const importPlanSchema = z.object({
  id: z.string().trim().min(1).max(64),
  description: z.string().trim().min(1).max(200),
  totalAmount: amount,
  installments: z.coerce.number().int().min(1).max(60),
  startDate: dateField,
  category: z.string().trim().min(1).max(40),
  paymentMethod: z.string().trim().min(1).max(40),
  notes: nullableText(1000),
});

export const importBudgetSchema = z.object({
  category: z.union([z.string(), z.null()]).optional().transform((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : null)),
  amount,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const importCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  key: nullableText(40),
  icon: z.string().trim().min(1).max(8).catch("🏷️"),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).catch("#6366f1"),
  active: z.boolean().catch(true),
});

export const importPaymentMethodSchema = z.object({
  name: z.string().trim().min(1).max(40),
  key: nullableText(40),
  icon: z.string().trim().min(1).max(8).catch("💳"),
  active: z.boolean().catch(true),
});

export interface ParsedImport {
  expenses: ImportExpense[];
  plans: z.infer<typeof importPlanSchema>[];
  budgets: z.infer<typeof importBudgetSchema>[];
  categories: z.infer<typeof importCategorySchema>[];
  paymentMethods: z.infer<typeof importPaymentMethodSchema>[];
  errors: string[];
}

const MAX_ROWS = 20_000;

/** Valida un backup JSON. Devuelve filas validas y una lista de errores legibles. */
export function parseBackupJson(text: string): ParsedImport {
  const result: ParsedImport = { expenses: [], plans: [], budgets: [], categories: [], paymentMethods: [], errors: [] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    result.errors.push("El archivo no es un JSON válido.");
    return result;
  }
  if (typeof data !== "object" || data === null) {
    result.errors.push("El archivo no tiene la estructura esperada.");
    return result;
  }
  const obj = data as Record<string, unknown>;
  // Aceptamos tambien un array plano de gastos.
  const expensesRaw = Array.isArray(obj) ? obj : Array.isArray(obj.expenses) ? obj.expenses : null;
  if (!expensesRaw) {
    result.errors.push('No se encontró la lista "expenses" en el archivo.');
    return result;
  }
  if (expensesRaw.length > MAX_ROWS) {
    result.errors.push(`El archivo tiene demasiados gastos (máximo ${MAX_ROWS}).`);
    return result;
  }
  expensesRaw.forEach((row, i) => {
    const parsed = importExpenseSchema.safeParse(row);
    if (parsed.success) result.expenses.push(parsed.data);
    else result.errors.push(`Gasto #${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join(".") || "fila"}: ${x.message}`).join(", ")}`);
  });
  if (!Array.isArray(obj)) {
    for (const [key, schema, target] of [
      ["installmentPlans", importPlanSchema, "plans"],
      ["budgets", importBudgetSchema, "budgets"],
      ["categories", importCategorySchema, "categories"],
      ["paymentMethods", importPaymentMethodSchema, "paymentMethods"],
    ] as const) {
      const rows = obj[key];
      if (!Array.isArray(rows)) continue;
      rows.slice(0, MAX_ROWS).forEach((row, i) => {
        const parsed = schema.safeParse(row);
        if (parsed.success) (result[target] as unknown[]).push(parsed.data);
        else result.errors.push(`${key} #${i + 1}: ${parsed.error.issues.map((x) => x.message).join(", ")}`);
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = [
  "id",
  "fecha",
  "hora",
  "monto",
  "categoria",
  "descripcion",
  "metodo_pago",
  "origen",
  "destino",
  "notas",
  "cuotas",
  "cuota_numero",
  "plan_id",
] as const;

const CSV_ALIASES: Record<string, keyof ImportExpense> = {
  id: "id",
  fecha: "date",
  date: "date",
  hora: "time",
  time: "time",
  monto: "amount",
  amount: "amount",
  importe: "amount",
  categoria: "category",
  categoría: "category",
  category: "category",
  descripcion: "description",
  descripción: "description",
  description: "description",
  metodo_pago: "paymentMethod",
  método_pago: "paymentMethod",
  metodo: "paymentMethod",
  paymentmethod: "paymentMethod",
  payment_method: "paymentMethod",
  origen: "origin",
  origin: "origin",
  destino: "destination",
  destination: "destination",
  notas: "notes",
  notes: "notes",
  cuotas: "installments",
  installments: "installments",
  cuota_numero: "installmentNumber",
  installmentnumber: "installmentNumber",
  plan_id: "installmentPlanId",
  installmentplanid: "installmentPlanId",
};

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function expensesToCsv(expenses: BackupExpense[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const e of expenses) {
    lines.push(
      [
        e.id,
        e.date,
        e.time ?? "",
        e.amount.toFixed(2),
        e.category,
        e.description ?? "",
        e.paymentMethod,
        e.origin ?? "",
        e.destination ?? "",
        e.notes ?? "",
        e.installments,
        e.installmentNumber,
        e.installmentPlanId ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  // BOM para que Excel detecte UTF-8.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Parser CSV RFC 4180 con deteccion de delimitador ("," o ";"). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Convierte fechas "DD/MM/YYYY" a ISO; deja pasar ISO. */
function normalizeDate(v: string): string {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return v.trim();
}

export function parseBackupCsv(text: string): ParsedImport {
  const result: ParsedImport = { expenses: [], plans: [], budgets: [], categories: [], paymentMethods: [], errors: [] };
  const rows = parseCsv(text);
  if (rows.length < 2) {
    result.errors.push("El CSV no tiene filas de datos.");
    return result;
  }
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const mapping = header.map((h) => CSV_ALIASES[h] ?? null);
  const required: (keyof ImportExpense)[] = ["date", "amount", "category"];
  for (const r of required) {
    if (!mapping.includes(r)) {
      result.errors.push(`Falta la columna "${r === "date" ? "fecha" : r === "amount" ? "monto" : "categoria"}" en el CSV.`);
    }
  }
  if (result.errors.length) return result;
  if (rows.length - 1 > MAX_ROWS) {
    result.errors.push(`El archivo tiene demasiadas filas (máximo ${MAX_ROWS}).`);
    return result;
  }
  for (let i = 1; i < rows.length; i++) {
    const raw: Record<string, string> = {};
    rows[i].forEach((cell, j) => {
      const key = mapping[j];
      if (key) raw[key] = cell;
    });
    if (raw.date) raw.date = normalizeDate(raw.date);
    const parsed = importExpenseSchema.safeParse(raw);
    if (parsed.success) result.expenses.push(parsed.data);
    else result.errors.push(`Fila ${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join(".") || "fila"}: ${x.message}`).join(", ")}`);
  }
  return result;
}

/** Clave de deduplicacion "natural" cuando no hay id. */
export function expenseDedupKey(e: { date: string; amount: number; description: string | null; category: string; time?: string | null }): string {
  return [e.date, e.amount.toFixed(2), (e.description ?? "").trim().toLowerCase(), e.category.trim().toLowerCase(), e.time ?? ""].join("|");
}
