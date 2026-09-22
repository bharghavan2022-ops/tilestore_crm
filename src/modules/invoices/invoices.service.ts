import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { nextDocumentNumber } from "../../lib/sequence";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { assertOwnCustomerOrStaff, type AuthUser } from "../../lib/authz";
import type { createInvoiceSchema, listInvoicesQuerySchema } from "./invoices.schema";

const INVOICE_INCLUDE = {
  customer: true,
  order: { select: { id: true, orderNumber: true, status: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true } } } },
  payments: { orderBy: { paidAt: "desc" as const } },
} satisfies Prisma.InvoiceInclude;

export async function listInvoices(user: AuthUser, query: z.infer<typeof listInvoicesQuerySchema>) {
  const customerFilter = user.role === "CLIENT" ? (user.customerId ?? "__none__") : query.customerId;
  const where: Prisma.InvoiceWhereInput = { status: query.status, customerId: customerFilter };

  const [data, total] = await prisma.$transaction([
    prisma.invoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.invoice.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getInvoice(user: AuthUser, id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
  if (!invoice) throw new NotFoundError("Invoice not found");
  assertOwnCustomerOrStaff(user, invoice.customerId);
  return invoice;
}

// Customer -> Order -> Invoice. Line items are copied from the order as a
// real, itemized financial record - never a bare total.
export async function createInvoice(input: z.infer<typeof createInvoiceSchema>, actorId: string) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, include: { items: true } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status === "CANCELLED") {
    throw new ForbiddenError("Cannot invoice a cancelled order");
  }
  const existing = await prisma.invoice.findUnique({ where: { orderId: input.orderId } });
  if (existing) throw new BadRequestError("This order has already been invoiced");

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextDocumentNumber(tx, "invoice", "INV");
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: order.customerId,
        orderId: order.id,
        subtotal: order.subtotal,
        taxTotal: order.taxTotal,
        grandTotal: order.grandTotal,
        amountPaid: 0,
        amountDue: order.grandTotal,
        dueDate: input.dueDate,
        status: "ISSUED",
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: INVOICE_INCLUDE,
    });

    await recordAudit(tx, {
      userId: actorId,
      entityType: "Invoice",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
      context: { orderId: order.id },
    });

    return created;
  });
}
