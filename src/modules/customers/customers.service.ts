import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type {
  createCustomerSchema,
  updateCustomerSchema,
  createContactSchema,
  listCustomersQuerySchema,
} from "./customers.schema";

export async function listCustomers(query: z.infer<typeof listCustomersQuerySchema>) {
  const where: Prisma.CustomerWhereInput = {
    isActive: query.isActive,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { companyName: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.customer.count({ where }),
  ]);

  return paginated(data, total, query);
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id }, include: { contacts: true } });
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
}

export async function createCustomer(input: z.infer<typeof createCustomerSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({ data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Customer",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function updateCustomer(id: string, input: z.infer<typeof updateCustomerSchema>, actorId: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Customer not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.customer.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Customer",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}

export async function addContact(customerId: string, input: z.infer<typeof createContactSchema>, actorId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError("Customer not found");

  return prisma.$transaction(async (tx) => {
    const created = await tx.contact.create({ data: { ...input, customerId } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Contact",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
      context: { customerId },
    });
    return created;
  });
}

export async function listContacts(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError("Customer not found");
  return prisma.contact.findMany({ where: { customerId }, orderBy: { isPrimary: "desc" } });
}
