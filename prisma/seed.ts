import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@tilestore.local";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) {
    console.log(`Owner ${ownerEmail} already exists, skipping seed.`);
    return;
  }

  const passwordHash = await hashPassword(ownerPassword);
  const owner = await prisma.user.create({
    data: { email: ownerEmail, passwordHash, name: "Owner", role: "OWNER" },
  });

  const teams = await prisma.$transaction([
    prisma.team.create({ data: { name: "Sales", type: "SALES" } }),
    prisma.team.create({ data: { name: "Warehouse", type: "WAREHOUSE" } }),
    prisma.team.create({ data: { name: "Purchase", type: "PURCHASE" } }),
    prisma.team.create({ data: { name: "Accounts", type: "ACCOUNTS" } }),
    prisma.team.create({ data: { name: "Delivery", type: "DELIVERY" } }),
  ]);

  const mainWarehouse = await prisma.warehouse.create({
    data: { name: "Main Warehouse", type: "WAREHOUSE", address: "Industrial Area" },
  });
  await prisma.warehouse.create({
    data: { name: "Showroom Store", type: "STORE", address: "Main Street" },
  });

  const incentiveRule = await prisma.incentiveRule.create({
    data: { name: "Default", activityWeight: 10, salesClosedPct: 0.01, collectionsPct: 0.005, isActive: true },
  });

  console.log("Seed complete:");
  console.log(`  Owner login: ${ownerEmail} / ${ownerPassword}`);
  console.log(`  Owner id: ${owner.id}`);
  console.log(`  Teams: ${teams.map((t) => t.name).join(", ")}`);
  console.log(`  Warehouse: ${mainWarehouse.name}`);
  console.log(`  Incentive rule: ${incentiveRule.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
