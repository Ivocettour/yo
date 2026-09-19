"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export function DeleteExpenseButton({ id, hasPlan, installments }: { id: string; hasPlan: boolean; installments: number }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"one" | "plan">("one");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error } = useToast();

  const confirm = () => {
    startTransition(async () => {
      const res = await deleteExpense(id, { deletePlan: hasPlan && scope === "plan" });
      if (!res.ok) {
        error(res.error);
        return;
      }
      success(res.message ?? "Gasto eliminado.");
      setOpen(false);
      router.push("/gastos");
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="outline" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Eliminar
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        title="¿Eliminar este gasto?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={pending}
      >
        {hasPlan ? (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
            <label className="flex items-center gap-3">
              <input type="radio" name="scope" checked={scope === "one"} onChange={() => setScope("one")} className="h-4 w-4" />
              Solo esta cuota
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="scope" checked={scope === "plan"} onChange={() => setScope("plan")} className="h-4 w-4" />
              Todas las cuotas de esta compra ({installments})
            </label>
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
