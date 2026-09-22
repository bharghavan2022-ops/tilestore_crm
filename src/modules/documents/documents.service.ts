import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { toSkipTake, paginated } from "../../lib/pagination";
import type { createDocumentSchema, listDocumentsQuerySchema } from "./documents.schema";

export async function listDocuments(query: z.infer<typeof listDocumentsQuerySchema>) {
  const where = { entityType: query.entityType, entityId: query.entityId };
  const [data, total] = await prisma.$transaction([
    prisma.document.findMany({
      where,
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
    }),
    prisma.document.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function createDocument(input: z.infer<typeof createDocumentSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: { ...input, uploadedById: actorId },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Document",
      entityId: created.id,
      action: "UPLOADED",
      newValue: created,
      context: { forEntityType: input.entityType, forEntityId: input.entityId },
    });
    return created;
  });
}
