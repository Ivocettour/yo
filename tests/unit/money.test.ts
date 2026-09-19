import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyDiff, formatPercent, parseAmountInput, round2, splitInstallments } from "@/lib/utils/money";
import { formatAmountForInput, numberToInputAmount } from "@/components/ui/amount-input";

describe("formatMoney", () => {
  it("formatea en pesos argentinos sin centavos", () => {
    expect(formatMoney(125450)).toBe("$ 125.450");
    expect(formatMoney(0)).toBe("$ 0");
  });
  it("muestra centavos cuando existen", () => {
    expect(formatMoney(3920.5)).toBe("$ 3.920,50");
  });
  it("formatea diferencias con signo", () => {
    expect(formatMoneyDiff(15000)).toBe("+$ 15.000");
    expect(formatMoneyDiff(-3000)).toBe("-$ 3.000");
    expect(formatMoneyDiff(0)).toBe("$ 0");
  });
  it("formatea porcentajes con coma decimal", () => {
    expect(formatPercent(13.6)).toBe("13,6%");
    expect(formatPercent(NaN)).toBe("—");
  });
  it("modo compacto para millones", () => {
    expect(formatMoney(2_500_000, { compact: true })).toBe("$ 2,5 M");
  });
});

describe("parseAmountInput", () => {
  it("acepta formatos argentinos e internacionales", () => {
    expect(parseAmountInput("8500")).toBe(8500);
    expect(parseAmountInput("8.500")).toBe(8500);
    expect(parseAmountInput("8.500,50")).toBe(8500.5);
    expect(parseAmountInput("8500,50")).toBe(8500.5);
    expect(parseAmountInput("8500.50")).toBe(8500.5);
    expect(parseAmountInput("1.234.567")).toBe(1234567);
    expect(parseAmountInput("$ 8.500")).toBe(8500);
    expect(parseAmountInput(1234.567)).toBe(1234.57);
  });
  it("rechaza valores invalidos", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("1,2,3")).toBeNull();
    expect(parseAmountInput(null)).toBeNull();
    expect(parseAmountInput(Infinity)).toBeNull();
  });
});

describe("splitInstallments", () => {
  it("divide exactamente el total en cuotas", () => {
    expect(splitInstallments(120000, 12)).toEqual(Array(12).fill(10000));
  });
  it("reparte el redondeo sin perder centavos", () => {
    const parts = splitInstallments(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
    expect(round2(parts.reduce((a, b) => a + b, 0))).toBe(100);
  });
  it("devuelve vacio para cantidades invalidas", () => {
    expect(splitInstallments(100, 0)).toEqual([]);
  });
});

describe("AmountInput helpers", () => {
  it("formatea mientras se escribe", () => {
    expect(formatAmountForInput("8500")).toBe("8.500");
    expect(formatAmountForInput("8500,5")).toBe("8.500,5");
    expect(formatAmountForInput("8500,555")).toBe("8.500,55");
    expect(formatAmountForInput("abc12")).toBe("12");
  });
  it("convierte numeros a texto de input", () => {
    expect(numberToInputAmount(8500)).toBe("8.500");
    expect(numberToInputAmount(8500.5)).toBe("8.500,50");
    expect(numberToInputAmount(null)).toBe("");
  });
});
