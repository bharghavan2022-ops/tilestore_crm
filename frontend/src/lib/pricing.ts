// Mirrors src/lib/pricing.ts on the backend, purely for live totals preview
// in the UI - the backend remains the source of truth for what's actually
// saved.
export interface PricedLine {
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxPct?: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineTotal(line: PricedLine): number {
  const gross = line.quantity * line.unitPrice;
  const discounted = gross * (1 - (line.discountPct ?? 0) / 100);
  const tax = discounted * ((line.taxPct ?? 0) / 100);
  return round2(discounted + tax);
}

export function documentTotal(lines: PricedLine[]): number {
  return round2(lines.reduce((sum, line) => sum + lineTotal(line), 0));
}
