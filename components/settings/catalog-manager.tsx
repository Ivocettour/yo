"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/actions/types";
import {
  createCategory,
  createPaymentMethod,
  deleteCategory,
  deletePaymentMethod,
  setCategoryActive,
  setPaymentMethodActive,
  updateCategory,
  updatePaymentMethod,
} from "@/lib/actions/catalog";
import type { CategoryDTO, PaymentMethodDTO } from "@/lib/queries/expenses";
import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS, PAYMENT_ICON_OPTIONS } from "@/lib/defaults";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

type Kind = "category" | "payment";

type Item = CategoryDTO | (PaymentMethodDTO & { color?: undefined });

interface CatalogManagerProps {
  kind: Kind;
  items: Item[];
}

const LABELS = {
  category: { singular: "categoría", plural: "categorías", new: "Nueva categoría", edit: "Editar categoría" },
  payment: { singular: "método de pago", plural: "métodos de pago", new: "Nuevo método de pago", edit: "Editar método de pago" },
};

export function CatalogManager({ kind, items }: CatalogManagerProps) {
  const [editing, setEditing] = useState<Item | null | "new">(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [pending, startTransition] = useTransition();
  const { success, error } = useToast();
  const labels = LABELS[kind];

  const toggle = (item: Item) => {
    startTransition(async () => {
      const res = kind === "category" ? await setCategoryActive(item.id, !item.active) : await setPaymentMethodActive(item.id, !item.active);
      if (res.ok) success(res.message ?? "Actualizado.");
      else error(res.error);
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const res = kind === "category" ? await deleteCategory(deleting.id) : await deletePaymentMethod(deleting.id);
      if (res.ok) success(res.message ?? "Eliminado.");
      else error(res.error);
      setDeleting(null);
    });
  };

  const active = items.filter((i) => i.active);
  const inactive = items.filter((i) => !i.active);

  return (
    <div className={cn("flex flex-col gap-4", pending && "opacity-80")}>
      <Button onClick={() => setEditing("new")} size="lg">
        <Plus className="h-5 w-5" /> {labels.new}
      </Button>

      <Card>
        <ul className="divide-y divide-border/60">
          {active.map((item) => (
            <Row key={item.id} item={item} onEdit={() => setEditing(item)} onToggle={() => toggle(item)} onDelete={() => setDeleting(item)} />
          ))}
          {active.length === 0 ? <li className="px-5 py-6 text-center text-sm text-muted">No hay {labels.plural} activas.</li> : null}
        </ul>
      </Card>

      {inactive.length ? (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Desactivadas</p>
          <Card>
            <ul className="divide-y divide-border/60">
              {inactive.map((item) => (
                <Row key={item.id} item={item} onEdit={() => setEditing(item)} onToggle={() => toggle(item)} onDelete={() => setDeleting(item)} />
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {editing ? (
        <EditSheet kind={kind} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} title={editing === "new" ? labels.new : labels.edit} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={`¿Eliminar ${labels.singular}?`}
        description={`Si "${deleting?.name}" tiene gastos asociados, se desactivará en lugar de eliminarse para no perder datos.`}
        confirmLabel="Eliminar"
        danger
        loading={pending}
      />
    </div>
  );
}

function Row({ item, onEdit, onToggle, onDelete }: { item: Item; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: item.color ? `${item.color}1f` : "var(--surface-2)" }}
        aria-hidden
      >
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-medium", !item.active && "text-muted line-through")}>{item.name}</span>
        {item.key === "uber" ? <Badge tone="primary">Usada para el resumen de Uber</Badge> : null}
        {item.key === "credit" ? <Badge tone="primary">Habilita cuotas</Badge> : null}
      </span>
      <div className="flex shrink-0 gap-0.5">
        <IconButton label="Editar" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label={item.active ? "Desactivar" : "Activar"} onClick={onToggle}>
          {item.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </IconButton>
        <IconButton label="Eliminar" onClick={onDelete} danger>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </li>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors",
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EditSheet({ kind, item, onClose, title }: { kind: Kind; item: Item | null; onClose: () => void; title: string }) {
  const action =
    kind === "category"
      ? item
        ? updateCategory.bind(null, item.id)
        : createCategory
      : item
        ? updatePaymentMethod.bind(null, item.id)
        : createPaymentMethod;
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);
  const { success } = useToast();
  const handled = useRef(false);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const icons = kind === "category" ? CATEGORY_ICON_OPTIONS : PAYMENT_ICON_OPTIONS;
  const [icon, setIcon] = useState(item?.icon ?? icons[0]);
  const [color, setColor] = useState(item?.color ?? CATEGORY_COLOR_OPTIONS[0]);

  useEffect(() => {
    if (state?.ok && !handled.current) {
      handled.current = true;
      success(state.message ?? "Guardado.");
      onClose();
    }
  }, [state, success, onClose]);

  return (
    <Sheet open onClose={onClose} title={title} size="sm">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <FormError message={state && !state.ok && !Object.keys(errors).length ? state.error : null} />
        <Field label="Nombre" htmlFor="c-name" error={errors.name} required>
          <Input id="c-name" name="name" defaultValue={item?.name ?? ""} maxLength={40} autoFocus required aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Ícono" error={errors.icon}>
          <input type="hidden" name="icon" value={icon} />
          <div className="flex flex-wrap gap-2">
            {icons.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                aria-label={`Ícono ${i}`}
                aria-pressed={icon === i}
                className={cn("flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition", icon === i ? "border-primary bg-primary-soft" : "border-border bg-surface")}
              >
                {i}
              </button>
            ))}
            <Input
              aria-label="Otro emoji"
              placeholder="Otro…"
              maxLength={8}
              className="h-11 min-h-0 w-24 px-3 text-center text-xl"
              onChange={(e) => e.target.value.trim() && setIcon(e.target.value.trim())}
            />
          </div>
        </Field>
        {kind === "category" ? (
          <Field label="Color" error={errors.color}>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className={cn("h-9 w-9 rounded-full border-2 transition", color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
        ) : null}
        <Button type="submit" size="lg" loading={pending}>
          Guardar
        </Button>
      </form>
    </Sheet>
  );
}
