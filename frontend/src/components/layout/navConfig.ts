export interface NavItem {
  label: string;
  path: string;
  /** Routes not built in this pass render a "coming soon" placeholder. */
  available: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Command Center", path: "/", available: true },
  { label: "CRM & Leads", path: "/crm", available: true },
  { label: "Orders", path: "/orders", available: true },
  { label: "Inventory", path: "/inventory", available: true },
  { label: "Purchasing", path: "/purchasing", available: true },
  { label: "Logistics", path: "/logistics", available: true },
  { label: "Payments", path: "/payments", available: false },
  { label: "Profitability", path: "/profitability", available: false },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "People & Assets", path: "/people-assets", available: false },
  { label: "HR / Incentives", path: "/hr-incentives", available: false },
];
