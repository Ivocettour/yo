"use client";

import { useActionState, useState } from "react";
import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { importBackupAction } from "@/lib/actions/backup";
import type { ActionResult } from "@/lib/actions/types";
import type { ImportSummary } from "@/lib/backup/service";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormError } from "@/components/ui/field";

export function DataManager({ expenseCount }: { expenseCount: number }) {
  const [state, action, pending] = useActionState<ActionResult<ImportSummary> | null, FormData>(importBackupAction, null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Exportar datos" subtitle={`${expenseCount} gasto${expenseCount === 1 ? "" : "s"} registrado${expenseCount === 1 ? "" : "s"}`} />
        <CardBody className="flex flex-col gap-3 pt-3">
          <p className="text-sm text-muted">
            El <strong>JSON</strong> es un backup completo (gastos, categorías, métodos de pago, cuotas y presupuestos) y sirve para restaurar todo.
            El <strong>CSV</strong> contiene solo los gastos, ideal para abrir en Excel o Google Sheets.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/api/export?format=json"
              download
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
            >
              <FileJson className="h-5 w-5" /> Backup JSON
            </a>
            <a
              href="/api/export?format=csv"
              download
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold transition hover:bg-surface-2"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar CSV
            </a>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Importar backup" subtitle="JSON o CSV exportado desde esta app" />
        <CardBody className="pt-3">
          <form action={action} className="flex flex-col gap-4">
            <FormError message={state && !state.ok ? state.error : null} />
            {state?.ok ? (
              <div className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
                <p className="font-medium">{state.message}</p>
                <ul className="mt-1 list-inside list-disc text-xs opacity-90">
                  {state.data.categoriesCreated ? <li>{state.data.categoriesCreated} categoría(s) creada(s)</li> : null}
                  {state.data.paymentMethodsCreated ? <li>{state.data.paymentMethodsCreated} método(s) de pago creado(s)</li> : null}
                  {state.data.plansCreated ? <li>{state.data.plansCreated} plan(es) de cuotas</li> : null}
                  {state.data.budgetsUpserted ? <li>{state.data.budgetsUpserted} presupuesto(s)</li> : null}
                </ul>
                {state.data.errors.length ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium">{state.data.errors.length} fila(s) con errores (omitidas)</summary>
                    <ul className="mt-1 max-h-40 overflow-auto rounded-xl bg-surface p-2 text-foreground">
                      {state.data.errors.slice(0, 50).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : null}
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-2/50 px-4 py-8 text-center transition hover:border-primary">
              <Upload className="h-6 w-6 text-muted" />
              <span className="text-sm font-medium">{fileName ?? "Elegir archivo .json o .csv"}</span>
              <span className="text-xs text-muted">Máximo 10 MB. Los gastos repetidos se omiten automáticamente.</span>
              <input
                type="file"
                name="file"
                accept=".json,.csv,application/json,text/csv"
                className="sr-only"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
            <Button type="submit" size="lg" loading={pending} disabled={!fileName}>
              <Download className="h-5 w-5" /> Importar
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
