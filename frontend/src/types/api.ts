export type Role = "OWNER" | "ADMIN" | "TEAM_LEAD" | "TEAM_MEMBER" | "CLIENT";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "INVITED";
export type TeamType = "SALES" | "WAREHOUSE" | "PURCHASE" | "ACCOUNTS" | "DELIVERY" | "OTHER";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  teamId: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gstNumber: string | null;
  segment: "RETAIL" | "ARCHITECT" | "BUILDER" | "CONTRACTOR" | "OTHER";
  isActive: boolean;
  createdAt: string;
}

export type LeadStatus = "NEW" | "CONTACTED" | "SITE_VISIT_SCHEDULED" | "SURVEY_DONE" | "QUOTED" | "WON" | "LOST";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: "CALL" | "SITE_VISIT" | "FOLLOW_UP" | "NOTE" | "EMAIL" | "MEETING";
  notes: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  customerId: string;
  customer: Customer;
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string; teamId: string | null } | null;
  status: LeadStatus;
  source: string | null;
  lostReason: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  activities: LeadActivity[];
}

export type QuotationStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUIRED"
  | "CONVERTED"
  | "EXPIRED";

export interface QuotationItem {
  id: string;
  productId: string;
  product: { id: string; sku: string; name: string; unit: string };
  description: string | null;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  taxPct: string;
  lineTotal: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer: Customer;
  leadId: string | null;
  salespersonId: string;
  salesperson: { id: string; name: string; email: string; teamId: string | null };
  status: QuotationStatus;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  items: QuotationItem[];
  approvals: { id: string; approverId: string; approver: { id: string; name: string }; decision: string; comment: string | null; decidedAt: string }[];
}

export type OrderStatus =
  | "CONFIRMED"
  | "STOCK_CHECK_PENDING"
  | "PARTIALLY_RESERVED"
  | "RESERVED"
  | "AWAITING_PURCHASE"
  | "PICKING"
  | "PACKED"
  | "READY_FOR_DISPATCH"
  | "DISPATCHED"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  productId: string;
  product: { id: string; sku: string; name: string; unit: string };
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  reservedQuantity: string;
  shortfallQuantity: string;
}

export type FulfilmentStage = "PICK" | "PACK" | "LABEL" | "HANDOFF";
export type TaskStatus = "YET_TO_START" | "IN_PROGRESS" | "CHANGES_REQUIRED" | "APPROVAL_PENDING" | "COMPLETED";

export interface FulfilmentTask {
  id: string;
  orderId: string;
  stage: FulfilmentStage;
  status: TaskStatus;
  assignedToId: string | null;
  notes: string | null;
  completedAt: string | null;
}

export interface Shortage {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  requestedQuantity: string;
  availableQuantity: string;
  shortfallQuantity: string;
  status: "OPEN" | "PO_CREATED" | "PARTIALLY_RECEIVED" | "RESOLVED" | "CANCELLED";
  purchaseOrderId: string | null;
  createdAt: string;
  order?: { id: string; orderNumber: string };
  product?: { id: string; sku: string; name: string };
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  quotationId: string | null;
  salespersonId: string;
  salesperson: { id: string; name: string; email: string };
  status: OrderStatus;
  paymentTerms: string | null;
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  fulfilmentTasks: FulfilmentTask[];
  shortages: Shortage[];
}

export interface Brand {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brandId: string | null;
  brand: Brand | null;
  category: string | null;
  variant: string | null;
  size: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  reorderPoint: string;
  isActive: boolean;
}

export type LocationType = "WAREHOUSE" | "STORE";

export interface Warehouse {
  id: string;
  name: string;
  type: LocationType;
  address: string | null;
  isActive: boolean;
}

export interface StockItem {
  id: string;
  productId: string;
  product: { id: string; sku: string; name: string; unit: string; reorderPoint: string };
  warehouseId: string;
  warehouse: { id: string; name: string; type: LocationType };
  quantityOnHand: string;
  quantityReserved: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  isActive: boolean;
}

export type PurchaseOrderStatus = "DRAFT" | "SENT" | "CONFIRMED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product: { id: string; sku: string; name: string; unit: string };
  quantityOrdered: string;
  quantityReceived: string;
  unitCost: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor: Vendor;
  status: PurchaseOrderStatus;
  expectedAt: string | null;
  createdAt: string;
  items: PurchaseOrderItem[];
  goodsReceipts: { id: string; receivedAt: string; items: unknown[] }[];
}

export type DeliveryStatus = "PENDING_DISPATCH" | "IN_TRANSIT" | "ON_TIME" | "DELAYED" | "DELIVERED" | "POD_PENDING" | "POD_UPLOADED";

export interface Delivery {
  id: string;
  orderId: string;
  order: { id: string; orderNumber: string; customerId: string; status: string; salespersonId?: string };
  vehicleId: string | null;
  vehicle: { id: string; registrationNumber: string } | null;
  driverName: string | null;
  destinationAddress: string;
  status: DeliveryStatus;
  dispatchedAt: string | null;
  eta: string | null;
  deliveredAt: string | null;
  delayEvents: { id: string; reason: string; createdAt: string }[];
  pod: { id: string; fileUrl: string | null; status: string; uploadedAt: string | null } | null;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  type: string | null;
  capacity: string | null;
  isActive: boolean;
}

export interface CommandCenterData {
  openLeads: number;
  pendingApprovals: number;
  ordersInProgress: number;
  openShortages: number;
  deliveriesInTransit: number;
  outstandingReceivables: number;
}

export interface CrmDashboardData {
  byStatus: Record<string, number>;
  totalLeads: number;
  winRatePct: number | null;
}

export interface InventoryAlertsData {
  belowReorderPoint: { id: string; sku: string; name: string; available: number; reorderPoint: number }[];
  openShortagesCount: number;
}

export interface PurchaseTrackingData {
  byStatus: Record<string, number>;
  overdue: { id: string; poNumber: string; expectedAt: string | null; vendor: { name: string } }[];
}

export interface LogisticsTrackerData {
  byStatus: Record<string, number>;
}
