import { PrismaClient } from "@prisma/client";

export const testPrisma = new PrismaClient();

const TABLES_IN_DELETE_ORDER = [
  "Payment",
  "InvoiceItem",
  "Invoice",
  "ProofOfDelivery",
  "DeliveryDelayEvent",
  "Delivery",
  "Vehicle",
  "GoodsReceiptItem",
  "GoodsReceipt",
  "PurchaseOrderItem",
  "PurchaseOrder",
  "Vendor",
  "Shortage",
  "StockReservation",
  "FulfilmentTask",
  "OrderItem",
  "Order",
  "QuotationApproval",
  "QuotationItem",
  "Quotation",
  "LeadActivity",
  "Lead",
  "Contact",
  "StockMovement",
  "StockItem",
  "Product",
  "Brand",
  "Warehouse",
  "Customer",
  "AuditLog",
  "RefreshToken",
  "User",
  "Team",
  "Counter",
];

// Full reset between test files. Only ever point this at a disposable test
// database (see docker-compose.yml) - it truncates everything.
export async function resetDatabase(): Promise<void> {
  await testPrisma.$transaction(
    TABLES_IN_DELETE_ORDER.map((table) => testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)),
  );
}
