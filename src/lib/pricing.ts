export interface PricedLine {
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxPct?: number;
}

export interface LineComputation {
  discountedSubtotal: number;
  taxAmount: number;
  lineTotal: number;
}

// Shared line-item math: gross = qty * unitPrice, minus discount%, plus tax%
// on the discounted amount. Rounded to 2dp (currency) at the line level so
// totals summed from lines always match what a client would recompute.
export function computeLine(line: PricedLine): LineComputation {
  const gross = line.quantity * line.unitPrice;
  const discountedSubtotal = gross * (1 - (line.discountPct ?? 0) / 100);
  const taxAmount = discountedSubtotal * ((line.taxPct ?? 0) / 100);
  const lineTotal = round2(discountedSubtotal + taxAmount);
  return { discountedSubtotal: round2(discountedSubtotal), taxAmount: round2(taxAmount), lineTotal };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface DocumentTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}

export function computeTotals(lines: PricedLine[]): DocumentTotals {
  let grossTotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  for (const line of lines) {
    const gross = line.quantity * line.unitPrice;
    const computed = computeLine(line);
    grossTotal += gross;
    discountTotal += gross - computed.discountedSubtotal;
    taxTotal += computed.taxAmount;
    grandTotal += computed.lineTotal;
  }

  return {
    subtotal: round2(grossTotal - discountTotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(grandTotal),
  };
}
