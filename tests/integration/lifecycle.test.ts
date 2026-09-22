import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { hashPassword } from "../../src/lib/password";
import { resetDatabase, testPrisma } from "./testUtils";

// Full Lead -> Quotation -> Approval -> Order -> Stock Gate -> Fulfilment ->
// Dispatch -> Delivery -> POD -> Invoice -> Payment lifecycle, driven
// entirely through the HTTP API as a real client would use it.
//
// Requires a reachable Postgres (see docker-compose.yml) with migrations
// applied: `docker compose up -d && npx prisma migrate deploy` before
// running `npm run test:integration`.
const app = createApp();

async function createStaffUser(email: string, role: "OWNER" | "ADMIN" | "TEAM_LEAD" | "TEAM_MEMBER", teamId?: string) {
  const passwordHash = await hashPassword("Password123!");
  return testPrisma.user.create({ data: { email, passwordHash, name: email, role, teamId } });
}

async function login(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123!" });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

describe("TILE / OS core business lifecycle", () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("carries an order from lead through payment, keeping stock and status consistent", async () => {
    const owner = await createStaffUser("owner@test.local", "OWNER");
    const ownerToken = await login("owner@test.local");

    const warehouse = await testPrisma.warehouse.create({ data: { name: "Main", type: "WAREHOUSE" } });
    const product = await testPrisma.product.create({
      data: { sku: "TILE-001", name: "Ceramic Tile 2x2", unit: "BOX", costPrice: 100, sellingPrice: 200 },
    });
    // Enough physical stock to fully satisfy the order.
    await testPrisma.stockItem.create({
      data: { productId: product.id, warehouseId: warehouse.id, quantityOnHand: 100 },
    });

    const customerRes = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Shree Enterprises", phone: "9990001111" });
    expect(customerRes.status).toBe(201);
    const customerId = customerRes.body.data.id;

    const leadRes = await request(app)
      .post("/api/v1/leads")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ customerId, assignedToId: owner.id, source: "walk-in" });
    expect(leadRes.status).toBe(201);
    const leadId = leadRes.body.data.id;

    const quotationRes = await request(app)
      .post("/api/v1/quotations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        customerId,
        leadId,
        items: [{ productId: product.id, quantity: 10, unitPrice: 200, taxPct: 18 }],
      });
    expect(quotationRes.status).toBe(201);
    const quotationId = quotationRes.body.data.id;
    expect(quotationRes.body.data.status).toBe("DRAFT");

    const submitRes = await request(app)
      .post(`/api/v1/quotations/${quotationId}/submit`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe("PENDING_APPROVAL");

    const approveRes = await request(app)
      .post(`/api/v1/quotations/${quotationId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ decision: "APPROVED" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("APPROVED");

    // Lead should have advanced to QUOTED as a side effect of approval.
    const leadAfterApproval = await testPrisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    expect(leadAfterApproval.status).toBe("QUOTED");

    const orderRes = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ quotationId });
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.data;
    // Sufficient physical stock -> Stock Gate should reserve fully, no shortage.
    expect(order.status).toBe("RESERVED");
    expect(order.shortages).toHaveLength(0);

    const stockAfterReservation = await testPrisma.stockItem.findFirstOrThrow({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    expect(stockAfterReservation.quantityReserved.toNumber()).toBe(10);

    const pickTask = order.fulfilmentTasks.find((t: { stage: string }) => t.stage === "PICK");
    const packTask = order.fulfilmentTasks.find((t: { stage: string }) => t.stage === "PACK");
    const labelTask = order.fulfilmentTasks.find((t: { stage: string }) => t.stage === "LABEL");
    const handoffTask = order.fulfilmentTasks.find((t: { stage: string }) => t.stage === "HANDOFF");

    // Cannot pack before pick is completed.
    const packTooEarly = await request(app)
      .patch(`/api/v1/orders/${order.id}/fulfilment/${packTask.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "COMPLETED" });
    expect(packTooEarly.status).toBe(403);

    const pickDone = await request(app)
      .patch(`/api/v1/orders/${order.id}/fulfilment/${pickTask.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "COMPLETED" });
    expect(pickDone.status).toBe(200);

    // Picking should have physically issued the stock (on-hand decremented).
    const stockAfterPick = await testPrisma.stockItem.findFirstOrThrow({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    expect(stockAfterPick.quantityOnHand.toNumber()).toBe(90);
    expect(stockAfterPick.quantityReserved.toNumber()).toBe(0);

    for (const task of [packTask, labelTask, handoffTask]) {
      const res = await request(app)
        .patch(`/api/v1/orders/${order.id}/fulfilment/${task.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ status: "COMPLETED" });
      expect(res.status).toBe(200);
    }

    const orderReady = await testPrisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(orderReady.status).toBe("READY_FOR_DISPATCH");

    const deliveryRes = await request(app)
      .post("/api/v1/logistics/deliveries")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ orderId: order.id, destinationAddress: "123 Main Street" });
    expect(deliveryRes.status).toBe(201);
    const deliveryId = deliveryRes.body.data.id;

    const dispatchRes = await request(app)
      .post(`/api/v1/logistics/deliveries/${deliveryId}/dispatch`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe("IN_TRANSIT");

    const deliverRes = await request(app)
      .post(`/api/v1/logistics/deliveries/${deliveryId}/deliver`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.data.status).toBe("DELIVERED");

    const podRes = await request(app)
      .post(`/api/v1/logistics/deliveries/${deliveryId}/pod`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fileUrl: "https://drive.google.com/file/d/abc123" });
    expect(podRes.status).toBe(200);
    expect(podRes.body.data.status).toBe("UPLOADED");

    const invoiceRes = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ orderId: order.id, dueDate: new Date(Date.now() + 7 * 86400000).toISOString() });
    expect(invoiceRes.status).toBe(201);
    const invoice = invoiceRes.body.data;
    expect(Number(invoice.grandTotal)).toBeCloseTo(2360, 2); // 10 * 200 * 1.18

    const paymentRes = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ invoiceId: invoice.id, amount: invoice.grandTotal, method: "BANK_TRANSFER" });
    expect(paymentRes.status).toBe(201);

    const finalOrder = await testPrisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.status).toBe("CLOSED");

    const finalInvoice = await testPrisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(finalInvoice.status).toBe("PAID");
    expect(finalInvoice.amountDue.toNumber()).toBe(0);
  });

  it("opens a Shortage when physical + confirmed inbound stock cannot cover the order", async () => {
    await createStaffUser("owner2@test.local", "OWNER");
    const ownerToken = await login("owner2@test.local");

    const warehouse = await testPrisma.warehouse.create({ data: { name: "Main", type: "WAREHOUSE" } });
    const product = await testPrisma.product.create({
      data: { sku: "TILE-002", name: "Porcelain Tile 4x4", unit: "BOX", costPrice: 150, sellingPrice: 300 },
    });
    await testPrisma.stockItem.create({
      data: { productId: product.id, warehouseId: warehouse.id, quantityOnHand: 2 },
    });

    const customerRes = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Low Stock Customer" });
    const customerId = customerRes.body.data.id;

    const quotationRes = await request(app)
      .post("/api/v1/quotations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 5, unitPrice: 300 }] });
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

    expect(orderRes.body.data.status).toBe("AWAITING_PURCHASE");
    expect(orderRes.body.data.shortages).toHaveLength(1);
    expect(orderRes.body.data.shortages[0].shortfallQuantity).toBe("3");

    const stock = await testPrisma.stockItem.findFirstOrThrow({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    // The 2 physically available units should still have been reserved.
    expect(stock.quantityReserved.toNumber()).toBe(2);
  });
});
