import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { nextDocumentNumber } from "../../lib/sequence";
import { computeLine, computeTotals } from "../../lib/pricing";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { quotationVisibilityWhere, type AuthUser } from "../../lib/authz";
import { notifyManagers, notifyUser } from "../../lib/notify";
import type {
  createQuotationSchema,
  updateQuotationItemsSchema,
  decideApprovalSchema,
  listQuotationsQuerySchema,
} from "./quotations.schema";

const QUOTATION_INCLUDE = {
  customer: true,
  salesperson: { select: { id: true, name: true, email: true, teamId: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
  approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { decidedAt: "desc" as const } },
} satisfies Prisma.QuotationInclude;

const EDITABLE_STATUSES = new Set(["DRAFT", "CHANGES_REQUIRED"]);

export async function listQuotations(user: AuthUser, query: z.infer<typeof listQuotationsQuerySchema>) {
  const where: Prisma.QuotationWhereInput = {
    AND: [quotationVisibilityWhere(user), { status: query.status, customerId: query.customerId }],
  };

  const [data, total] = await prisma.$transaction([
    prisma.quotation.findMany({
      where,
      include: QUOTATION_INCLUDE,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
    }),
    prisma.quotation.count({ where }),
  ]);

  return paginated(data, total, query);
}

export async function getQuotation(user: AuthUser, id: string) {
  const quotation = await prisma.quotation.findFirst({
    where: { AND: [{ id }, quotationVisibilityWhere(user)] },
    include: QUOTATION_INCLUDE,
  });
  if (!quotation) throw new NotFoundError("Quotation not found");
  return quotation;
}

async function buildItemRows(items: z.infer<typeof createQuotationSchema>["items"]) {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    if (!productMap.has(item.productId)) {
      throw new BadRequestError(`Unknown product: ${item.productId}`);
    }
  }

  return items.map((item) => ({
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPct: item.discountPct,
    taxPct: item.taxPct,
    lineTotal: computeLine(item).lineTotal,
  }));
}

export async function createQuotation(
  user: AuthUser,
  input: z.infer<typeof createQuotationSchema>,
  actorId: string,
) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("Customer not found");

  const salespersonId = input.salespersonId ?? actorId;
  const itemRows = await buildItemRows(input.items);
  const totals = computeTotals(input.items);

  return prisma.$transaction(async (tx) => {
    const quotationNumber = await nextDocumentNumber(tx, "quotation", "QTN");
    const created = await tx.quotation.create({
      data: {
        quotationNumber,
        customerId: input.customerId,
        leadId: input.leadId,
        salespersonId,
        terms: input.terms,
        validUntil: input.validUntil,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        items: { create: itemRows },
      },
      include: QUOTATION_INCLUDE,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Quotation",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function updateQuotationItems(
  user: AuthUser,
  id: string,
  input: z.infer<typeof updateQuotationItemsSchema>,
  actorId: string,
) {
  const existing = await prisma.quotation.findFirst({
    where: { AND: [{ id }, quotationVisibilityWhere(user)] },
  });
  if (!existing) throw new NotFoundError("Quotation not found");
  if (!EDITABLE_STATUSES.has(existing.status)) {
    throw new ForbiddenError(`Cannot edit a quotation in status ${existing.status}`);
  }

  const itemRows = await buildItemRows(input.items);
  const totals = computeTotals(input.items);

  return prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: id } });
    const updated = await tx.quotation.update({
      where: { id },
      data: {
        status: "DRAFT",
        terms: input.terms,
        validUntil: input.validUntil,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        items: { create: itemRows },
      },
      include: QUOTATION_INCLUDE,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Quotation",
      entityId: id,
      action: "ITEMS_UPDATED",
      previousValue: { status: existing.status },
      newValue: updated,
    });
    return updated;
  });
}

export async function submitForApproval(user: AuthUser, id: string, actorId: string) {
  const existing = await prisma.quotation.findFirst({
    where: { AND: [{ id }, quotationVisibilityWhere(user)] },
  });
  if (!existing) throw new NotFoundError("Quotation not found");
  if (!EDITABLE_STATUSES.has(existing.status)) {
    throw new ForbiddenError(`Cannot submit a quotation in status ${existing.status}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quotation.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" },
      include: QUOTATION_INCLUDE,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Quotation",
      entityId: id,
      action: "SUBMITTED_FOR_APPROVAL",
      previousValue: { status: existing.status },
      newValue: { status: updated.status },
    });
    await notifyManagers(tx, {
      type: "APPROVAL_NEEDED",
      title: `Quotation ${updated.quotationNumber} needs approval`,
      message: `Quotation ${updated.quotationNumber} for ${updated.customer.name} (${updated.grandTotal.toString()}) is pending your approval.`,
      entityType: "Quotation",
      entityId: id,
    });
    return updated;
  });
}

export async function decideApproval(
  id: string,
  input: z.infer<typeof decideApprovalSchema>,
  approverId: string,
) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Quotation not found");
  if (existing.status !== "PENDING_APPROVAL") {
    throw new ForbiddenError(`Cannot decide on a quotation in status ${existing.status}`);
  }

  const nextStatus = input.decision; // enum values line up 1:1 with QuotationStatus

  return prisma.$transaction(async (tx) => {
    await tx.quotationApproval.create({
      data: { quotationId: id, approverId, decision: input.decision, comment: input.comment },
    });
    const updated = await tx.quotation.update({
      where: { id },
      data: { status: nextStatus },
      include: QUOTATION_INCLUDE,
    });
    if (input.decision === "APPROVED" && existing.leadId) {
      await tx.lead.update({ where: { id: existing.leadId }, data: { status: "QUOTED" } });
    }
    await recordAudit(tx, {
      userId: approverId,
      entityType: "Quotation",
      entityId: id,
      action: "APPROVAL_DECISION",
      previousValue: { status: existing.status },
      newValue: { status: updated.status, decision: input.decision, comment: input.comment },
    });
    await notifyUser(tx, {
      userId: updated.salespersonId,
      type: "QUOTATION_DECISION",
      title: `Quotation ${updated.quotationNumber} ${input.decision.toLowerCase().replace("_", " ")}`,
      message: input.comment ?? `Quotation ${updated.quotationNumber} was ${input.decision.toLowerCase().replace("_", " ")}.`,
      entityType: "Quotation",
      entityId: id,
    });
    return updated;
  });
}
