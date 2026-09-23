import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Boxes,
  ShoppingBag,
  Truck,
  Wallet,
  TrendingUp,
  Briefcase,
  Award,
  type LucideIcon,
} from "lucide-react";

export interface AppTile {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Tailwind color name driving the tile's icon badge - one distinct
   * identity color per app, matching Odoo's app-launcher convention. */
  color: "amber" | "violet" | "blue" | "teal" | "orange" | "sky" | "emerald" | "rose" | "indigo" | "red";
  available: boolean;
}

export const APP_TILES: AppTile[] = [
  { label: "Command Center", path: "/command-center", icon: LayoutDashboard, color: "amber", available: true },
  { label: "CRM & Leads", path: "/crm", icon: Users, color: "violet", available: true },
  { label: "Orders", path: "/orders", icon: ShoppingCart, color: "blue", available: true },
  { label: "Inventory", path: "/inventory", icon: Boxes, color: "teal", available: true },
  { label: "Purchasing", path: "/purchasing", icon: ShoppingBag, color: "orange", available: true },
  { label: "Logistics", path: "/logistics", icon: Truck, color: "sky", available: true },
  { label: "Payments", path: "/payments", icon: Wallet, color: "emerald", available: false },
  { label: "Profitability", path: "/profitability", icon: TrendingUp, color: "rose", available: false },
  { label: "People & Assets", path: "/people-assets", icon: Briefcase, color: "indigo", available: false },
  { label: "HR / Incentives", path: "/hr-incentives", icon: Award, color: "red", available: false },
];

export const TILE_COLOR_CLASSES: Record<AppTile["color"], string> = {
  amber: "bg-amber-100 text-amber-600",
  violet: "bg-violet-100 text-violet-600",
  blue: "bg-blue-100 text-blue-600",
  teal: "bg-teal-100 text-teal-600",
  orange: "bg-orange-100 text-orange-600",
  sky: "bg-sky-100 text-sky-600",
  emerald: "bg-emerald-100 text-emerald-600",
  rose: "bg-rose-100 text-rose-600",
  indigo: "bg-indigo-100 text-indigo-600",
  red: "bg-red-100 text-red-600",
};
