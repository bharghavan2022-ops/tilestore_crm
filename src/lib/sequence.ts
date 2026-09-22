import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

// Atomically issues the next number in a named series (e.g. "quotation",
// "order") and formats it as PREFIX-YYYY-000001. Uses a single upsert
// (INSERT ... ON CONFLICT DO UPDATE) so it is safe under concurrent callers
// without needing an explicit row lock.
export async function nextDocumentNumber(
  client: TxClient,
  seriesKey: string,
  prefix: string,
  padLength = 6,
): Promise<string> {
  const counter = await client.counter.upsert({
    where: { key: seriesKey },
    update: { value: { increment: 1 } },
    create: { key: seriesKey, value: 1 },
  });

  const year = new Date().getFullYear();
  const padded = String(counter.value).padStart(padLength, "0");
  return `${prefix}-${year}-${padded}`;
}
