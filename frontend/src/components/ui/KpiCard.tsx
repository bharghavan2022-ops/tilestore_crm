import type { ReactNode } from "react";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "success" | "critical" | "warning" | "neutral";
}

const HINT_TONE: Record<NonNullable<KpiCardProps["hintTone"]>, string> = {
  success: "text-status-success",
  critical: "text-status-critical",
  warning: "text-status-warning",
  neutral: "text-muted",
};

export function KpiCard({ label, value, hint, hintTone = "neutral" }: KpiCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-figures text-3xl font-semibold text-ink-text">{value}</p>
      {hint && <p className={`mt-1 text-xs font-medium ${HINT_TONE[hintTone]}`}>{hint}</p>}
    </Card>
  );
}
