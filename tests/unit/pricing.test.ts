import { describe, expect, it } from "vitest";
import { computeLine, computeTotals } from "../../src/lib/pricing";

describe("computeLine", () => {
  it("computes gross total with no discount or tax", () => {
    const result = computeLine({ quantity: 10, unitPrice: 100 });
    expect(result.lineTotal).toBe(1000);
    expect(result.taxAmount).toBe(0);
  });

  it("applies discount before tax", () => {
    // 10 * 100 = 1000 gross, 10% discount -> 900, 5% tax -> 45 -> 945 total
    const result = computeLine({ quantity: 10, unitPrice: 100, discountPct: 10, taxPct: 5 });
    expect(result.discountedSubtotal).toBe(900);
    expect(result.taxAmount).toBe(45);
    expect(result.lineTotal).toBe(945);
  });

  it("rounds to 2 decimal places", () => {
    const result = computeLine({ quantity: 3, unitPrice: 33.333, discountPct: 0, taxPct: 0 });
    expect(result.lineTotal).toBe(100);
  });
});

describe("computeTotals", () => {
  it("sums multiple lines correctly", () => {
    const totals = computeTotals([
      { quantity: 10, unitPrice: 100, discountPct: 10, taxPct: 5 }, // 945
      { quantity: 2, unitPrice: 500, discountPct: 0, taxPct: 18 }, // 1180
    ]);
    expect(totals.grandTotal).toBe(945 + 1180);
    expect(totals.subtotal).toBeGreaterThan(0);
    expect(totals.taxTotal).toBeGreaterThan(0);
  });

  it("returns zeros for an empty line list", () => {
    const totals = computeTotals([]);
    expect(totals).toEqual({ subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 });
  });
});
