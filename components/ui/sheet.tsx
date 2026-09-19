"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Ancho maximo en desktop. */
  size?: "sm" | "md" | "lg";
  hideClose?: boolean;
}

const sizes = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-2xl" };

/**
 * Bottom sheet en mobile, dialogo centrado en desktop.
 * Bloquea el scroll del body, cierra con Escape o tocando el fondo.
 */
export function Sheet({ open, onClose, title, description, children, size = "md", hideClose }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Foco inicial en el panel para lectores de pantalla.
    const t = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]),select,textarea,button:not([data-close]),[href]",
      );
      (focusable ?? panelRef.current)?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50 animate-fade backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full max-h-[92dvh] flex-col rounded-t-3xl bg-surface shadow-float outline-none",
          "sm:rounded-3xl animate-sheet sm:animate-pop",
          sizes[size],
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="text-lg font-semibold leading-tight">
                  {title}
                </h2>
              ) : null}
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                data-close
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-5 pt-3 pb-safe">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
