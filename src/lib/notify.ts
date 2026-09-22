import type { NotificationType, Prisma, PrismaClient, Role } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

// The single place notifications get written from, so triggers stay out of
// individual controllers (per the workflow rules). Called from inside the
// same transaction as the event it describes wherever possible.
export async function notifyUser(client: TxClient, input: NotifyInput): Promise<void> {
  await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

export async function notifyUsers(client: TxClient, userIds: string[], input: Omit<NotifyInput, "userId">): Promise<void> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;
  await client.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  });
}

// Notifies everyone on a given team, plus every OWNER/ADMIN (managers
// generally want visibility into operational events across teams).
export async function notifyTeamAndManagers(
  client: TxClient,
  teamType: "SALES" | "WAREHOUSE" | "PURCHASE" | "ACCOUNTS" | "DELIVERY",
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  const users = await client.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ team: { type: teamType } }, { role: { in: ["OWNER", "ADMIN"] as Role[] } }],
    },
    select: { id: true },
  });
  await notifyUsers(client, users.map((u) => u.id), input);
}

export async function notifyManagers(client: TxClient, input: Omit<NotifyInput, "userId">): Promise<void> {
  const managers = await client.user.findMany({
    where: { status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  await notifyUsers(client, managers.map((u) => u.id), input);
}
