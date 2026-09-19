"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Evita desajustes de hidratacion: en servidor no conocemos el tema guardado.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const current = mounted ? (theme ?? "system") : "system";

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-medium transition-all active:scale-95",
              active ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            <o.icon className="h-5 w-5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
