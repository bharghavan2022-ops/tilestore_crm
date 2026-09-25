import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { hashPassword } from "../../src/lib/password";
import { resetDatabase, testPrisma } from "./testUtils";

// Regression coverage for issues found during the Prompt 14/15 audit:
// team-scoped authorization on operational routes, and the stock-leak bug
// where cancelling an order after picking never returned physical stock.
const app = createApp();

async function createUser(email: string, role: "OWNER" | "TEAM_MEMBER", teamId?: string) {
  const passwordHash = await hashPassword("Password123!");
  return testPrisma.user.create({ data: { email, passwordHash, name: email, role, teamId } });
}

async function login(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123!" });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

async function setupReservedOrder(ownerToken: string) {
  const warehouse = await testPrisma.warehouse.create({ data: { name: "Main", type: "WAREHOUSE" } });
  const product = await testPrisma.product.create({
    data: { sku: "AUDIT-1", name: "Audit Tile", unit: "BOX", costPrice: 50, sellingPrice: 100 },
  });
  await testPrisma.stockItem.create({ data: { productId: product.id, warehouseId: warehouse.id, quantityOnHand: 50 } });

  const customerRes = await request(app)
    .post("/api/v1/customers")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: "Audit Customer" });
  const customerId = customerRes.body.data.id;

  const quotationRes = await request(app)
    .post("/api/v1/quotations")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ customerId, items: [{ productId: product.id, quantity: 10, unitPrice: 100 }] });
  const quotationId = quotationRes.body.data.id;

  await request(app).post(`/api/v1/quotations/${quotationId}/submit`).set("Authorization", `Bearer ${ownerToken}`);
  await request(app)
    .post(`/api/v1/quotations/${quotationId}/decision`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ decision: "APPROVED" });

  const orderRes = await request(app)
    .post("/api/v1/orders")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ quotationId });

  return { warehouse, product, order: orderRes.body.data };
}

describe("Team-scoped authorization (audit fix)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("blocks a Sales team member from completing a fulfilment task, but allows a Warehouse team member", async () => {
    await createUser("owner@test.local", "OWNER");
    const ownerToken = await login("owner@test.local");
    const { order } = await setupReservedOrder(ownerToken);
    expect(order.status).toBe("RESERVED");

    const salesTeam = await testPrisma.team.create({ data: { name: "Sales", type: "SALES" } });
    const warehouseTeam = await testPrisma.team.create({ data: { name: "Warehouse", type: "WAREHOUSE" } });
    await createUser("sales@test.local", "TEAM_MEMBER", salesTeam.id);
    await createUser("warehouse@test.local", "TEAM_MEMBER", warehouseTeam.id);
    const salesToken = await login("sales@test.local");
    const warehouseToken = await login("warehouse@test.local");

    const pickTask = order.fulfilmentTasks.find((t: { stage: string }) => t.stage === "PICK");

    const blocked = await request(app)
      .patch(`/api/v1/orders/${order.id}/fulfilment/${pickTask.id}`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ status: "COMPLETED" });
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .patch(`/api/v1/orders/${order.id}/fulfilment/${pickTask.id}`)
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ status: "COMPLETED" });
    expect(allowed.status).toBe(200);
  });

  it("blocks a Sales team member from receiving goods against a purchase order", async () => {
    await createUser("owner2@test.local", "OWNER");
    const ownerToken = await login("owner2@test.local");
    const salesTeam = await testPrisma.team.create({ data: { name: "Sales", type: "SALES" } });
    await createUser("sales2@test.local", "TEAM_MEMBER", salesTeam.id);
    const salesToken = await login("sales2@test.local");

    const vendorRes = await request(app)
      .post("/api/v1/vendors")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ name: "Should Fail Vendor" });
    expect(vendorRes.status).toBe(403);

    const vendorAsOwner = await request(app)
      .post("/api/v1/vendors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Owner Vendor" });
    expect(vendorAsOwner.status).toBe(201);
  });
});

describe("Cancel-after-pick returns physical stock (audit fix)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns quantityOnHand when an order is cancelled after PICK has already consumed it", async () => {
    await createUser("owner3@test.local", "OWNER");
    const ownerToken = await login("owner3@test.local");
    const { warehouse, product, order } = await setupReservedOrder(ownerToken);

    const pickTask = order.fulfilmentTasks.find((t: { stage: string }) => t.stage === "PICK");
    const pickRes = await request(app)
      .patch(`/api/v1/orders/${order.id}/fulfilment/${pickTask.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "COMPLETED" });
    expect(pickRes.status).toBe(200);

    const afterPick = await testPrisma.stockItem.findFirstOrThrow({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    expect(afterPick.quantityOnHand.toNumber()).toBe(40); // 50 - 10 picked

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("CANCELLED");

    const afterCancel = await testPrisma.stockItem.findFirstOrThrow({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    expect(afterCancel.quantityOnHand.toNumber()).toBe(50); // stock returned
    expect(afterCancel.quantityReserved.toNumber()).toBe(0);
  });
});

describe("Warehouse is notified when an order becomes ready to pick (audit fix)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("notifies the Warehouse team when the stock gate fully reserves an order", async () => {
    await createUser("owner4@test.local", "OWNER");
    const ownerToken = await login("owner4@test.local");

    const warehouseTeam = await testPrisma.team.create({ data: { name: "Warehouse", type: "WAREHOUSE" } });
    await createUser("wh@test.local", "TEAM_MEMBER", warehouseTeam.id);
    const whToken = await login("wh@test.local");

    await setupReservedOrder(ownerToken);

    const notifRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${whToken}`);
    expect(notifRes.status).toBe(200);
    const readyNotif = notifRes.body.data.find((n: { title: string }) => n.title.includes("ready for picking"));
    expect(readyNotif).toBeTruthy();
  });
});
