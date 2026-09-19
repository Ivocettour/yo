/** Utilidades de moneda (pesos argentinos). */

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const arsFormatterCents = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto como "$ 125.450". Si tiene centavos, los muestra. */
export function formatMoney(amount: number, options?: { cents?: boolean; compact?: boolean }): string {
  if (!Number.isFinite(amount)) return "$ 0";
  if (options?.compact && Math.abs(amount) >= 1_000_000) {
    return `$ ${(amount / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  }
  const hasCents = options?.cents ?? Math.round(amount * 100) % 100 !== 0;
  return (hasCents ? arsFormatterCents : arsFormatter).format(amount).replace(/ /g, " ");
}

/** Formatea una diferencia con signo: "+$ 15.000" / "-$ 3.000". */
export function formatMoneyDiff(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(amount))}`;
}

/** Formatea porcentaje con coma decimal: "13,6%". */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Parsea un monto ingresado por el usuario en formato argentino o internacional.
 * Acepta "8500", "8.500", "8500,50", "8.500,50", "$ 8.500", "8500.50".
 */
export function parseAmountInput(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? round2(raw) : null;
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/\s|\$|ARS/gi, "");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // El ultimo separador es el decimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    if (s.split(",").length > 2) return null;
    s = s.replace(",", ".");
  } else if (hasDot) {
    // "8.500" son miles; "8500.50" es decimal; "1.234.567" son miles.
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      s = parts.join("");
    } else if (parts.length > 2) {
      s = parts.join("");
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return round2(n);
}

/** Divide un total en N cuotas cuyas sumas coinciden exactamente con el total. */
export function splitInstallments(total: number, count: number): number[] {
  if (count < 1) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}
