import { Phone, MapPin, Clock, StickyNote, Mail, Users, type LucideIcon } from "lucide-react";

export interface ActivityTypeConfig {
  value: "CALL" | "SITE_VISIT" | "FOLLOW_UP" | "NOTE" | "EMAIL" | "MEETING";
  label: string;
  icon: LucideIcon;
  /** Same gradient-badge treatment used across the app (launcher tiles, KPI
   * icons) - each activity type gets its own color identity, like Odoo's
   * activity-type icons (call/email/meeting each have a distinct glyph). */
  badgeClassName: string;
}

export const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  { value: "CALL", label: "Call", icon: Phone, badgeClassName: "bg-gradient-to-br from-blue-500 to-blue-600" },
  { value: "SITE_VISIT", label: "Site Visit", icon: MapPin, badgeClassName: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
  { value: "FOLLOW_UP", label: "Follow-up", icon: Clock, badgeClassName: "bg-gradient-to-br from-amber-500 to-orange-500" },
  { value: "NOTE", label: "Note", icon: StickyNote, badgeClassName: "bg-gradient-to-br from-slate-500 to-slate-600" },
  { value: "EMAIL", label: "Email", icon: Mail, badgeClassName: "bg-gradient-to-br from-violet-500 to-violet-600" },
  { value: "MEETING", label: "Meeting", icon: Users, badgeClassName: "bg-gradient-to-br from-rose-500 to-rose-600" },
];

export function activityTypeConfig(value: string): ActivityTypeConfig {
  return ACTIVITY_TYPES.find((t) => t.value === value) ?? ACTIVITY_TYPES[3]!;
}
