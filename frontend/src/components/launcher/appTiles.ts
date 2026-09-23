import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Boxes,
  ShoppingBag,
  Truck,
  Wallet,
  PieChart,
  Briefcase,
  Award,
  type LucideIcon,
} from "lucide-react";

export interface AppTile {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Two-tone gradient + white icon, like a real app icon (material-style
   * "sticker": solid color, bold glyph, drop shadow) rather than a thin
   * line icon in a pale box. One distinct color identity per app, the way
   * every Odoo app has its own icon color. */
  badgeClassName: string;
  available: boolean;
}

export const APP_TILES: AppTile[] = [
  {
    label: "Command Center",
    path: "/command-center",
    icon: LayoutDashboard,
    badgeClassName: "bg-gradient-to-br from-amber-400 to-orange-500",
    available: true,
  },
  {
    label: "CRM & Leads",
    path: "/crm",
    icon: Users,
    badgeClassName: "bg-gradient-to-br from-fuchsia-500 to-violet-600",
    available: true,
  },
  {
    label: "Orders",
    path: "/orders",
    icon: ShoppingCart,
    badgeClassName: "bg-gradient-to-br from-blue-500 to-indigo-600",
    available: true,
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: Boxes,
    badgeClassName: "bg-gradient-to-br from-emerald-500 to-teal-600",
    available: true,
  },
  {
    label: "Purchasing",
    path: "/purchasing",
    icon: ShoppingBag,
    badgeClassName: "bg-gradient-to-br from-orange-500 to-amber-600",
    available: true,
  },
  {
    label: "Logistics",
    path: "/logistics",
    icon: Truck,
    badgeClassName: "bg-gradient-to-br from-sky-500 to-blue-600",
    available: true,
  },
  {
    label: "Payments",
    path: "/payments",
    icon: Wallet,
    badgeClassName: "bg-gradient-to-br from-green-500 to-emerald-600",
    available: false,
  },
  {
    label: "Profitability",
    path: "/profitability",
    icon: PieChart,
    badgeClassName: "bg-gradient-to-br from-rose-500 to-pink-600",
    available: false,
  },
  {
    label: "People & Assets",
    path: "/people-assets",
    icon: Briefcase,
    badgeClassName: "bg-gradient-to-br from-indigo-500 to-purple-600",
    available: false,
  },
  {
    label: "HR / Incentives",
    path: "/hr-incentives",
    icon: Award,
    badgeClassName: "bg-gradient-to-br from-red-500 to-rose-600",
    available: false,
  },
];
