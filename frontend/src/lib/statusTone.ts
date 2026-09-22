import type { BadgeTone } from "../components/ui/Badge";

// Centralized status -> badge color mapping so every table/page renders the
// same status consistently instead of re-deriving tone logic per page.
const TONE_MAP: Record<string, BadgeTone> = {
  // Leads
  NEW: "info",
  CONTACTED: "info",
  SITE_VISIT_SCHEDULED: "info",
  SURVEY_DONE: "info",
  QUOTED: "warning",
  WON: "success",
  LOST: "critical",

  // Quotations
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "critical",
  CHANGES_REQUIRED: "warning",
  CONVERTED: "success",
  EXPIRED: "neutral",

  // Orders
  CONFIRMED: "info",
  STOCK_CHECK_PENDING: "warning",
  PARTIALLY_RESERVED: "warning",
  RESERVED: "success",
  AWAITING_PURCHASE: "critical",
  PICKING: "info",
  PACKED: "info",
  READY_FOR_DISPATCH: "info",
  DISPATCHED: "info",
  DELIVERED: "success",
  CLOSED: "success",
  CANCELLED: "neutral",

  // Fulfilment tasks
  YET_TO_START: "neutral",
  IN_PROGRESS: "info",
  APPROVAL_PENDING: "warning",
  COMPLETED: "success",

  // Purchase orders
  SENT: "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",

  // Shortages
  OPEN: "critical",
  PO_CREATED: "warning",
  RESOLVED: "success",

  // Deliveries
  PENDING_DISPATCH: "neutral",
  IN_TRANSIT: "info",
  ON_TIME: "success",
  DELAYED: "critical",
  POD_PENDING: "warning",
  POD_UPLOADED: "success",
};

export function statusTone(status: string): BadgeTone {
  return TONE_MAP[status] ?? "neutral";
}

export function humanizeStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
