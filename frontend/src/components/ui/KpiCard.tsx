import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "success" | "critical" | "warning" | "neutral";
  icon?: LucideIcon;
  /** Same gradient-badge treatment as the app launcher tiles, e.g.
   * "bg-gradient-to-br from-violet-500 to-purple-600". */
  iconClassName?: string;
}

const HINT_TONE: Record<NonNullable<KpiCardProps["hintTone"]>, string> = {
  success: "text-status-success",
  critical: "text-status-critical",
  warning: "text-status-warning",
  neutral: "text-muted",
};

export function KpiCard({ label, value, hint, hintTone = "neutral", icon: Icon, iconClassName }: KpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-figures text-3xl font-semibold text-ink-text">{value}</p>
          {hint && <p className={`mt-1 text-xs font-medium ${HINT_TONE[hintTone]}`}>{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${iconClassName}`}>
            <Icon size={19} strokeWidth={2} />
          </span>
        )}
      </div>
    </Card>
  );
}
