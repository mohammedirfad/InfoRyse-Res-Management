import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { GET as getTableOrders } from "@/app/api/public/table-orders/route";

describe("Shared Table Tab & Multi-Guest Ordering Integrity", () => {
  const testRunId = nanoid(8);
  let restaurant: any;
  let table: any;
  let item1: any;
  let item2: any;

  beforeAll(async () => {
    restaurant = await db.restaurant.create({
      data: {
        slug: `test-shared-${testRunId}`,
        name: `Shared Diner ${testRunId}`,
        isActive: true,
        openNow: true,
        taxPercent: 5,
      },
    });

    table = await db.table.create({
      data: {
        restaurantId: restaurant.id,
        label: "Table O2",
        qrToken: `qr_o2_${testRunId}`,
        status: "OCCUPIED",
      },
    });

    const category = await db.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Main Course",
        position: 1,
      },
    });

    item1 = await db.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: "Butter Chicken",
        priceCents: 35000, // 350 INR
        isAvailable: true,
      },
    });

    item2 = await db.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: "Garlic Naan",
        priceCents: 6000, // 60 INR
        isAvailable: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup in order of relations
    await db.orderItem.deleteMany({
      where: { order: { restaurantId: restaurant.id } },
    });
    await db.order.deleteMany({
      where: { restaurantId: restaurant.id },
    });
    await db.tableSession.deleteMany({
      where: { restaurantId: restaurant.id },
    });
    await db.menuItem.deleteMany({
      where: { restaurantId: restaurant.id },
    });
    await db.category.deleteMany({
      where: { restaurantId: restaurant.id },
    });
    await db.table.deleteMany({
      where: { restaurantId: restaurant.id },
    });
    await db.restaurant.deleteMany({
      where: { id: restaurant.id },
    });
  });

  it(
    "unifies multiple guest orders at Table O2 into one shared table session and running bill",
    async () => {
    // Guest 1: places Round 1 (1x Butter Chicken, 2x Garlic Naan)
    const session = await db.tableSession.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        status: "OPEN",
      },
    });

    const order1 = await db.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        tableSessionId: session.id,
        orderNumber: 1,
        idempotencyKey: nanoid(),
        customerName: "Alice",
        orderType: "DINE_IN",
        status: "NEW",
        subtotalCents: 47000,
        totalCents: 47000,
        items: {
          create: [
            {
              menuItemId: item1.id,
              nameSnapshot: item1.name,
              priceCentsSnapshot: item1.priceCents,
              quantity: 1,
            },
            {
              menuItemId: item2.id,
              nameSnapshot: item2.name,
              priceCentsSnapshot: item2.priceCents,
              quantity: 2,
            },
          ],
        },
      },
    });

    // Guest 2: places Round 2 (1x Butter Chicken) from their phone using same QR
    const order2 = await db.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        tableSessionId: session.id,
        orderNumber: 2,
        idempotencyKey: nanoid(),
        customerName: "Bob",
        orderType: "DINE_IN",
        status: "NEW",
        subtotalCents: 35000,
        totalCents: 35000,
        items: {
          create: [
            {
              menuItemId: item1.id,
              nameSnapshot: item1.name,
              priceCentsSnapshot: item1.priceCents,
              quantity: 1,
            },
          ],
        },
      },
    });

    // Guest 1: places Round 3 (2x Garlic Naan)
    const order3 = await db.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        tableSessionId: session.id,
        orderNumber: 3,
        idempotencyKey: nanoid(),
        customerName: "Alice",
        orderType: "DINE_IN",
        status: "NEW",
        subtotalCents: 12000,
        totalCents: 12000,
        items: {
          create: [
            {
              menuItemId: item2.id,
              nameSnapshot: item2.name,
              priceCentsSnapshot: item2.priceCents,
              quantity: 2,
            },
          ],
        },
      },
    });

    // Invoke GET /api/public/table-orders
    const req = new Request(
      `http://localhost:3000/api/public/table-orders?slug=${restaurant.slug}&qrToken=${table.qrToken}`
    );
    const res = await getTableOrders(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.table.label).toBe("Table O2");
    expect(body.session).not.toBeNull();
    expect(body.session.orders).toHaveLength(3);

    // Verify aggregated quantities:
    // Butter Chicken: 1 (round 1) + 1 (round 2) = 2
    // Garlic Naan: 2 (round 1) + 2 (round 3) = 4
    const aggMap = new Map(
      body.session.aggregatedItems.map((i: any) => [i.name, i.quantity])
    );
    expect(aggMap.get("Butter Chicken")).toBe(2);
    expect(aggMap.get("Garlic Naan")).toBe(4);

    // Subtotal: 2 * 35000 + 4 * 6000 = 70000 + 24000 = 94000 cents (₹940)
    expect(body.session.subtotalCents).toBe(94000);
    // GST (5%): 94000 * 0.05 = 4700 cents (₹47)
    expect(body.session.taxCents).toBe(4700);
    // Packaging: 2000 cents (₹20)
    expect(body.session.packingCents).toBe(2000);
    // Total: 94000 + 4700 + 2000 = 100700 cents (₹1007)
    expect(body.session.totalCents).toBe(100700);

    // Finalize session (billing cashier settles the bill)
    await db.tableSession.update({
      where: { id: session.id },
      data: { status: "FINALIZED" },
    });

    const resFinal = await getTableOrders(req);
    const bodyFinal = await resFinal.json();
    expect(bodyFinal.session).toBeNull();
  }, 25000);

  it("automatically creates and links an open session when orders exist without a session", async () => {
    // Simulate legacy unlinked order placed at table
    const unlinkedOrder = await db.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        orderNumber: 99,
        idempotencyKey: nanoid(),
        customerName: "Charlie",
        orderType: "DINE_IN",
        status: "NEW",
        subtotalCents: 35000,
        totalCents: 35000,
        items: {
          create: [
            {
              menuItemId: item1.id,
              nameSnapshot: item1.name,
              priceCentsSnapshot: item1.priceCents,
              quantity: 1,
            },
          ],
        },
      },
    });

    const req = new Request(
      `http://localhost:3000/api/public/table-orders?slug=${restaurant.slug}&qrToken=${table.qrToken}`
    );
    const res = await getTableOrders(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.session).not.toBeNull();
    expect(body.session.orders).toHaveLength(1);
    expect(body.session.orders[0].id).toBe(unlinkedOrder.id);
  }, 25000);
});

