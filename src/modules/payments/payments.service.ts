import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { assertOwnCustomerOrStaff, type AuthUser } from "../../lib/authz";
import type { createPaymentSchema, updatePaymentStatusSchema, listPaymentsQuerySchema } from "./payments.schema";

function invoiceStatusForBalance(grandTotal: number, amountPaid: number): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
  if (amountPaid <= 0) return "ISSUED";
  if (amountPaid >= grandTotal) return "PAID";
  return "PARTIALLY_PAID";
}

export async function listPayments(user: AuthUser, query: z.infer<typeof listPaymentsQuerySchema>) {
  const customerFilter = user.role === "CLIENT" ? (user.customerId ?? "__none__") : query.customerId;
  const where: Prisma.PaymentWhereInput = { invoiceId: query.invoiceId, customerId: customerFilter, status: query.status };
  const [data, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      include: { invoice: { select: { id: true, invoiceNumber: true } }, recordedBy: { select: { id: true, name: true } } },
      orderBy: { paidAt: "desc" },
      ...toSkipTake(query),
    }),
    prisma.payment.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getPayment(user: AuthUser, id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Payment not found");
  assertOwnCustomerOrStaff(user, payment.customerId);
  return payment;
}

// Customer -> Order -> Invoice -> Payment. A payment is always a real,
// itemized record tied to an invoice - never a status flag flip.
export async function createPayment(input: z.infer<typeof createPaymentSchema>, actorId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "CANCELLED") throw new ForbiddenError("Cannot record a payment against a cancelled invoice");

  return prisma.$transaction(async (tx) => {
    // Lock the invoice row so concurrent payments can't both pass the
    // "does not exceed amountDue" check against the same stale balance.
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoice.id} FOR UPDATE`;
    const locked = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });

    const amountDue = locked.amountDue.toNumber();
    if (input.amount > amountDue) {
      throw new BadRequestError(`Payment of ${input.amount} exceeds the outstanding balance of ${amountDue}`);
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        paidAt: input.paidAt ?? new Date(),
        recordedById: actorId,
        status: "RECORDED",
      },
    });

    const newAmountPaid = locked.amountPaid.toNumber() + input.amount;
    const newAmountDue = locked.grandTotal.toNumber() - newAmountPaid;
    const newStatus = invoiceStatusForBalance(locked.grandTotal.toNumber(), newAmountPaid);

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, amountDue: newAmountDue, status: newStatus },
    });

    if (newStatus === "PAID") {
      await tx.order.update({ where: { id: invoice.orderId }, data: { status: "CLOSED" } });
    }

    await recordAudit(tx, {
      userId: actorId,
      entityType: "Payment",
      entityId: payment.id,
      action: "RECORDED",
      newValue: payment,
      context: { invoiceId: invoice.id, invoiceStatus: updatedInvoice.status },
    });

    return payment;
  });
}

// BOUNCED/REFUNDED reverse the payment's effect on the invoice balance;
// CLEARED is a status-only transition (the amount already counted at RECORDED).
export async function updatePaymentStatus(id: string, input: z.infer<typeof updatePaymentStatusSchema>, actorId: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.status === input.status) return payment;
  if (payment.status === "BOUNCED" || payment.status === "REFUNDED") {
    throw new ForbiddenError(`Cannot change status of a payment already marked ${payment.status}`);
  }

  const reversing = input.status === "BOUNCED" || input.status === "REFUNDED";

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${payment.invoiceId} FOR UPDATE`;
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });

    const updatedPayment = await tx.payment.update({ where: { id }, data: { status: input.status } });

    if (reversing) {
      const newAmountPaid = Math.max(0, invoice.amountPaid.toNumber() - payment.amount.toNumber());
      const newAmountDue = invoice.grandTotal.toNumber() - newAmountPaid;
      const newStatus = invoiceStatusForBalance(invoice.grandTotal.toNumber(), newAmountPaid);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, amountDue: newAmountDue, status: newStatus },
      });
    }

    await recordAudit(tx, {
      userId: actorId,
      entityType: "Payment",
      entityId: id,
      action: "STATUS_CHANGED",
      previousValue: { status: payment.status },
      newValue: { status: input.status },
    });

    return updatedPayment;
  });
}
