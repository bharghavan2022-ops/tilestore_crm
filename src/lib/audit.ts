import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

interface RecordAuditInput {
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  context?: unknown;
}

// Every module writes here instead of hand-rolling its own audit inserts, so
// "who did what to which entity, and what changed" stays queryable in one
// place. Always call this inside the same transaction as the mutation it
// describes so the audit trail can never fall out of sync with the data.
export async function recordAudit(client: TxClient, input: RecordAuditInput) {
  await client.auditLog.create({
    data: {
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      previousValue: input.previousValue as Prisma.InputJsonValue,
      newValue: input.newValue as Prisma.InputJsonValue,
      context: input.context as Prisma.InputJsonValue,
    },
  });
}
