export type TaxRate = { name: string; percent: number };
export type TaxLine = TaxRate & { amountCents: number };

export function getTaxRates(
  taxName: string | null | undefined,
  taxPercent: number | null | undefined,
  additionalTaxes: unknown,
): TaxRate[] {
  const rates: TaxRate[] = [{ name: (taxName || "GST").trim() || "GST", percent: Number(taxPercent ?? 5) }];
  if (Array.isArray(additionalTaxes)) {
    for (const item of additionalTaxes) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as { name?: unknown; percent?: unknown };
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const percent = Number(candidate.percent);
      if (name && Number.isFinite(percent) && percent > 0) rates.push({ name, percent });
    }
  }
  return rates.filter((rate) => Number.isFinite(rate.percent) && rate.percent > 0);
}

export function calculateTaxBreakdown(taxableCents: number, rates: TaxRate[]): TaxLine[] {
  return rates.map((rate) => ({
    ...rate,
    amountCents: Math.round(taxableCents * rate.percent / 100),
  }));
}

export function taxTotal(lines: TaxLine[]) {
  return lines.reduce((total, line) => total + line.amountCents, 0);
}

export function taxSummary(lines: TaxLine[]) {
  return {
    taxName: lines.map((line) => line.name).join(" + ") || "Tax",
    taxPercent: lines.reduce((total, line) => total + line.percent, 0),
    taxCents: taxTotal(lines),
  };
}
