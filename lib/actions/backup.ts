"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/current-user";
import { parseBackupCsv, parseBackupJson } from "@/lib/backup/format";
import { importBackup, type ImportSummary } from "@/lib/backup/service";
import { fail, GENERIC_ERROR, UNAUTHORIZED_MESSAGE, type ActionResult } from "./types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function importBackupAction(_prev: unknown, formData: FormData): Promise<ActionResult<ImportSummary>> {
  try {
    const user = await requireUserForAction();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Elegí un archivo JSON o CSV.", { file: "Archivo requerido." });
    if (file.size > MAX_FILE_BYTES) return fail("El archivo supera los 10 MB.");
    const name = file.name.toLowerCase();
    const text = await file.text();
    const isJson = name.endsWith(".json") || text.trimStart().startsWith("{") || text.trimStart().startsWith("[");
    const parsed = isJson ? parseBackupJson(text) : parseBackupCsv(text);
    if (parsed.expenses.length === 0 && parsed.budgets.length === 0) {
      return fail(parsed.errors[0] ?? "El archivo no contiene gastos válidos.");
    }
    const summary = await importBackup(user.id, parsed);
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: summary,
      message: `Importación completa: ${summary.imported} gasto(s) nuevo(s), ${summary.skipped} omitido(s).`,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return fail(UNAUTHORIZED_MESSAGE);
    console.error(e);
    return fail(GENERIC_ERROR);
  }
}
