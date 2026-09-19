"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/utils/periods";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PeriodSelectorProps {
  value: PeriodKey;
  from: string;
  to: string;
  /** Si es true, oculta la opcion "Hoy" (para estadisticas). */
  hideToday?: boolean;
}

export function PeriodSelector({ value, from, to, hideToday }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState(value === "custom");

  const navigate = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const options = PERIOD_OPTIONS.filter((o) => !(hideToday && o.key === "today")).map((o) => ({ value: o.key, label: o.label }));

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <Segmented
          ariaLabel="Período"
          options={options}
          value={value}
          onChange={(k) => {
            if (k === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            navigate({ period: k, from: undefined, to: undefined });
          }}
          className={pending ? "opacity-70" : undefined}
        />
      </div>
      {custom ? (
        <form
          className="flex items-end gap-2 animate-in"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const f = String(fd.get("from") || "");
            const t = String(fd.get("to") || "");
            if (f && t) navigate({ period: "custom", from: f, to: t });
          }}
        >
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
            Desde
            <Input name="from" type="date" defaultValue={from} required className="min-h-11" />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
            Hasta
            <Input name="to" type="date" defaultValue={to} required className="min-h-11" />
          </label>
          <Button type="submit" size="md" loading={pending} className="h-11">
            Ver
          </Button>
        </form>
      ) : null}
    </div>
  );
}
