// Indian numbering (Lakh/Crore) currency formatting, matching the design
// reference's "₹18.4L" / "₹1.32Cr" style.
export function formatInr(value: number | string, opts: { compact?: boolean } = {}): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return "₹0";

  if (opts.compact ?? true) {
    const abs = Math.abs(amount);
    if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
    if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)}L`;
    if (abs >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  }

  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatFullInr(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return "₹0";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQty(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
