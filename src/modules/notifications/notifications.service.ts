import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { notifyUser, notifyTeamAndManagers } from "../../lib/notify";
import { NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type { listNotificationsQuerySchema } from "./notifications.schema";

export async function listMyNotifications(userId: string, query: z.infer<typeof listNotificationsQuerySchema>) {
  const where: Prisma.NotificationWhereInput = { userId, readAt: query.unreadOnly ? null : undefined };
  const [data, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { ...paginated(data, total, query), unreadCount };
}

export async function markRead(userId: string, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) throw new NotFoundError("Notification not found");
  if (notification.readAt) return notification;
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

// Payment Due -> Accounts / responsible users notified. No scheduler is
// wired up yet (see README), so this is exposed as an endpoint Accounts (or
// an external cron) can call periodically rather than firing automatically.
export async function runOverdueInvoiceCheck(_actorId: string): Promise<{ markedOverdue: number }> {
  const overdue = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } },
    include: { order: { select: { salespersonId: true } } },
  });

  if (overdue.length === 0) return { markedOverdue: 0 };

  await prisma.$transaction(async (tx) => {
    await tx.invoice.updateMany({
      where: { id: { in: overdue.map((i) => i.id) } },
      data: { status: "OVERDUE" },
    });

    for (const invoice of overdue) {
      await notifyTeamAndManagers(tx, "ACCOUNTS", {
        type: "PAYMENT_DUE",
        title: `Invoice ${invoice.invoiceNumber} is overdue`,
        message: `Invoice ${invoice.invoiceNumber} was due on ${invoice.dueDate.toDateString()} and still has ${invoice.amountDue.toString()} outstanding.`,
        entityType: "Invoice",
        entityId: invoice.id,
      });
      if (invoice.order?.salespersonId) {
        await notifyUser(tx, {
          userId: invoice.order.salespersonId,
          type: "PAYMENT_DUE",
          title: `Invoice ${invoice.invoiceNumber} is overdue`,
          message: `Your customer's invoice ${invoice.invoiceNumber} is now overdue.`,
          entityType: "Invoice",
          entityId: invoice.id,
        });
      }
    }
  });

  return { markedOverdue: overdue.length };
}
