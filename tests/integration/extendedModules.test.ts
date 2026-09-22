import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { hashPassword } from "../../src/lib/password";
import { resetDatabase, testPrisma } from "./testUtils";

// Covers Phases 10-14: Notifications, Documents, People & Assets,
// HR & Incentives, Profitability, Dashboard/Reporting - all driven through
// the real HTTP API against a real Postgres.
const app = createApp();

async function createOwner(email = "owner3@test.local") {
  const passwordHash = await hashPassword("Password123!");
  const owner = await testPrisma.user.create({ data: { email, passwordHash, name: "Owner", role: "OWNER" } });
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123!" });
  return { owner, token: res.body.accessToken as string };
}

describe("Notifications", () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("notifies a salesperson when a lead is assigned to them", async () => {
    const { token } = await createOwner();
    const sales = await testPrisma.user.create({
      data: { email: "sales@test.local", passwordHash: await hashPassword("x"), name: "Sales Rep", role: "TEAM_MEMBER" },
    });
    const customer = await testPrisma.customer.create({ data: { name: "Acme Tiles" } });

    const leadRes = await request(app)
      .post("/api/v1/leads")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerId: customer.id, assignedToId: sales.id });
    expect(leadRes.status).toBe(201);

    const salesToken = (
      await request(app).post("/api/v1/auth/login").send({ email: "sales@test.local", password: "x" })
    ).body.accessToken;

    const notifRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${salesToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.length).toBeGreaterThan(0);
    expect(notifRes.body.data[0].type).toBe("TASK_ASSIGNED");
    expect(notifRes.body.unreadCount).toBe(1);

    const markRes = await request(app)
      .post(`/api/v1/notifications/${notifRes.body.data[0].id}/read`)
      .set("Authorization", `Bearer ${salesToken}`);
    expect(markRes.status).toBe(200);
    expect(markRes.body.data.readAt).not.toBeNull();
  });
});

describe("Documents", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("stores a Google Drive link against an entity and lists it back", async () => {
    const { token } = await createOwner();
    const customer = await testPrisma.customer.create({ data: { name: "Doc Customer" } });

    const createRes = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        entityType: "Customer",
        entityId: customer.id,
        category: "DOCUMENT",
        fileUrl: "https://drive.google.com/file/d/xyz",
        title: "Site survey",
      });
    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/documents?entityType=Customer&entityId=${customer.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].fileUrl).toBe("https://drive.google.com/file/d/xyz");
  });

  it("rejects a document without a real URL", async () => {
    const { token } = await createOwner();
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({ entityType: "Customer", entityId: "abc", category: "DOCUMENT", fileUrl: "not-a-url" });
    expect(res.status).toBe(400);
  });
});

describe("People & Assets", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("takes an asset through create -> assign -> maintenance -> return", async () => {
    const { token } = await createOwner();
    const employee = await testPrisma.user.create({
      data: { email: "warehouse@test.local", passwordHash: await hashPassword("x"), name: "Warehouse Staff", role: "TEAM_MEMBER" },
    });

    const createRes = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Forklift 1", type: "FORKLIFT", serialNumber: "FL-001" });
    expect(createRes.status).toBe(201);
    const assetId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe("AVAILABLE");

    const assignRes = await request(app)
      .post(`/api/v1/assets/${assetId}/assign`)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: employee.id });
    expect(assignRes.status).toBe(201);

    // Can't assign an already-assigned asset.
    const doubleAssignRes = await request(app)
      .post(`/api/v1/assets/${assetId}/assign`)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: employee.id });
    expect(doubleAssignRes.status).toBe(403);

    const maintenanceRes = await request(app)
      .post(`/api/v1/assets/${assetId}/maintenance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Oil change", cost: 50 });
    expect(maintenanceRes.status).toBe(201);

    const returnRes = await request(app)
      .post(`/api/v1/assets/${assetId}/return`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notes: "Returned in good condition" });
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.returnedAt).not.toBeNull();

    const getRes = await request(app).get(`/api/v1/assets/${assetId}`).set("Authorization", `Bearer ${token}`);
    expect(getRes.body.data.status).toBe("AVAILABLE");
    expect(getRes.body.data.assignments).toHaveLength(1);
    expect(getRes.body.data.maintenances).toHaveLength(1);
  });
});

describe("HR & Incentives", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lets staff acknowledge a policy once, and rejects a second attempt", async () => {
    const { token } = await createOwner();
    const policyRes = await request(app)
      .post("/api/v1/hr-policies")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Code of Conduct", description: "Be excellent to each other." });
    expect(policyRes.status).toBe(201);

    const ackRes = await request(app)
      .post(`/api/v1/hr-policies/${policyRes.body.data.id}/acknowledge`)
      .set("Authorization", `Bearer ${token}`);
    expect(ackRes.status).toBe(201);

    const secondAckRes = await request(app)
      .post(`/api/v1/hr-policies/${policyRes.body.data.id}/acknowledge`)
      .set("Authorization", `Bearer ${token}`);
    expect(secondAckRes.status).toBe(409);
  });

  it("computes an incentive report from real activity/sales/collections data", async () => {
    const { owner, token } = await createOwner();
    await request(app)
      .post("/api/v1/incentives/rules")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Default", activityWeight: 10, salesClosedPct: 0.01, collectionsPct: 0.02 });

    const customer = await testPrisma.customer.create({ data: { name: "Incentive Customer" } });
    const lead = await testPrisma.lead.create({
      data: { customerId: customer.id, createdById: owner.id, assignedToId: owner.id },
    });
    await testPrisma.leadActivity.create({ data: { leadId: lead.id, type: "CALL", createdById: owner.id } });

    const now = new Date();
    const reportRes = await request(app)
      .get(`/api/v1/incentives/report?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set("Authorization", `Bearer ${token}`);
    expect(reportRes.status).toBe(200);
    const ownerRow = reportRes.body.data.rows.find((r: { userId: string }) => r.userId === owner.id);
    expect(ownerRow.activityCount).toBe(1);
    expect(ownerRow.activityScore).toBe(10);
  });
});

describe("Profitability & Dashboard", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("computes profitability summary and command-center from real order data", async () => {
    const { owner, token } = await createOwner();
    const warehouse = await testPrisma.warehouse.create({ data: { name: "Main", type: "WAREHOUSE" } });
    const brand = await testPrisma.brand.create({ data: { name: "Kajaria" } });
    const product = await testPrisma.product.create({
      data: { sku: "P-1", name: "Tile", unit: "BOX", brandId: brand.id, costPrice: 100, sellingPrice: 250 },
    });
    await testPrisma.stockItem.create({ data: { productId: product.id, warehouseId: warehouse.id, quantityOnHand: 50 } });
    const customer = await testPrisma.customer.create({ data: { name: "Profit Customer", segment: "BUILDER" } });

    await testPrisma.order.create({
      data: {
        orderNumber: "ORD-TEST-1",
        customerId: customer.id,
        salespersonId: owner.id,
        status: "DELIVERED",
        subtotal: 2500,
        taxTotal: 0,
        grandTotal: 2500,
        items: { create: [{ productId: product.id, quantity: 10, unitPrice: 250, lineTotal: 2500 }] },
      },
    });

    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();

    const summaryRes = await request(app)
      .get(`/api/v1/profitability/summary?from=${from}&to=${to}`)
      .set("Authorization", `Bearer ${token}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.revenue).toBe(2500);
    expect(summaryRes.body.data.cost).toBe(1000);
    expect(summaryRes.body.data.grossMargin).toBe(1500);

    const commandCenterRes = await request(app)
      .get("/api/v1/dashboard/command-center")
      .set("Authorization", `Bearer ${token}`);
    expect(commandCenterRes.status).toBe(200);
    expect(typeof commandCenterRes.body.data.openLeads).toBe("number");
  });
});
