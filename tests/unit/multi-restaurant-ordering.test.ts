import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

describe("Multi-Restaurant & Multi-Table Ordering & Concurrency Integrity", () => {
  const testRunId = nanoid(8);
  let restaurantA: any;
  let restaurantB: any;
  let restaurantC: any;

  let tableA1: any;
  let tableA2: any;
  let tableB1: any;
  let tableC1: any;

  let itemA: any;
  let itemB: any;
  let itemC: any;

  beforeAll(async () => {
    // 1) Create 3 distinct test restaurants
    restaurantA = await db.restaurant.create({
      data: {
        slug: `test-rest-a-${testRunId}`,
        name: `Spice Symphony ${testRunId}`,
        isActive: true,
        openNow: true,
      },
    });

    restaurantB = await db.restaurant.create({
      data: {
        slug: `test-rest-b-${testRunId}`,
        name: `Urban Bistro ${testRunId}`,
        isActive: true,
        openNow: true,
      },
    });

    restaurantC = await db.restaurant.create({
      data: {
        slug: `test-rest-c-${testRunId}`,
        name: `Harbor Grill ${testRunId}`,
        isActive: true,
        openNow: true,
      },
    });

    // 2) Create tables for each restaurant
    tableA1 = await db.table.create({
      data: {
        restaurantId: restaurantA.id,
        label: "Table 01",
        qrToken: `qr_a1_${testRunId}`,
        status: "OCCUPIED",
      },
    });

    tableA2 = await db.table.create({
      data: {
        restaurantId: restaurantA.id,
        label: "Table 02",
        qrToken: `qr_a2_${testRunId}`,
        status: "OCCUPIED",
      },
    });

    tableB1 = await db.table.create({
      data: {
        restaurantId: restaurantB.id,
        label: "Table 01",
        qrToken: `qr_b1_${testRunId}`,
        status: "OCCUPIED",
      },
    });

    tableC1 = await db.table.create({
      data: {
        restaurantId: restaurantC.id,
        label: "Table 01",
        qrToken: `qr_c1_${testRunId}`,
        status: "OCCUPIED",
      },
    });

    // 3) Create categories & items for each
    const catA = await db.category.create({
      data: { restaurantId: restaurantA.id, name: "Starters", position: 1 },
    });
    itemA = await db.menuItem.create({
      data: {
        restaurantId: restaurantA.id,
        categoryId: catA.id,
        name: "Paneer Tikka",
        priceCents: 28000,
        isVeg: true,
      },
    });

    const catB = await db.category.create({
      data: { restaurantId: restaurantB.id, name: "Mains", position: 1 },
    });
    itemB = await db.menuItem.create({
      data: {
        restaurantId: restaurantB.id,
        categoryId: catB.id,
        name: "Pasta Primavera",
        priceCents: 32000,
        isVeg: true,
      },
    });

    const catC = await db.category.create({
      data: { restaurantId: restaurantC.id, name: "Grill", position: 1 },
    });
    itemC = await db.menuItem.create({
      data: {
        restaurantId: restaurantC.id,
        categoryId: catC.id,
        name: "Grilled Fish",
        priceCents: 45000,
        isVeg: false,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      const restIds = [restaurantA?.id, restaurantB?.id, restaurantC?.id].filter(Boolean);
      await db.orderItem.deleteMany({ where: { order: { restaurantId: { in: restIds } } } });
      await db.orderStatusHistory.deleteMany({ where: { order: { restaurantId: { in: restIds } } } });
      await db.order.deleteMany({ where: { restaurantId: { in: restIds } } });
      await db.tableSession.deleteMany({ where: { restaurantId: { in: restIds } } });
      await db.table.deleteMany({ where: { restaurantId: { in: restIds } } });
      await db.menuItem.deleteMany({ where: { restaurantId: { in: restIds } } });
      await db.category.deleteMany({ where: { restaurantId: { in: restIds } } });
      await db.restaurant.deleteMany({ where: { id: { in: restIds } } });
    } catch { /* ignore cleanup errors */ }
  });

  it("ensures orders from 3 different restaurants maintain completely isolated order sequences", async () => {
    // Place order for Restaurant A
    const orderA = await db.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { restaurantId: restaurantA.id },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const orderNumber = (last?.orderNumber ?? 0) + 1;
      return tx.order.create({
        data: {
          restaurantId: restaurantA.id,
          tableId: tableA1.id,
          orderNumber,
          subtotalCents: itemA.priceCents,
          totalCents: itemA.priceCents,
          idempotencyKey: `ord_a_${testRunId}`,
          items: {
            create: [{
              menuItemId: itemA.id,
              nameSnapshot: itemA.name,
              priceCentsSnapshot: itemA.priceCents,
              quantity: 1,
            }],
          },
        },
      });
    });

    // Place order for Restaurant B
    const orderB = await db.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { restaurantId: restaurantB.id },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const orderNumber = (last?.orderNumber ?? 0) + 1;
      return tx.order.create({
        data: {
          restaurantId: restaurantB.id,
          tableId: tableB1.id,
          orderNumber,
          subtotalCents: itemB.priceCents,
          totalCents: itemB.priceCents,
          idempotencyKey: `ord_b_${testRunId}`,
          items: {
            create: [{
              menuItemId: itemB.id,
              nameSnapshot: itemB.name,
              priceCentsSnapshot: itemB.priceCents,
              quantity: 1,
            }],
          },
        },
      });
    });

    // Place order for Restaurant C
    const orderC = await db.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { restaurantId: restaurantC.id },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const orderNumber = (last?.orderNumber ?? 0) + 1;
      return tx.order.create({
        data: {
          restaurantId: restaurantC.id,
          tableId: tableC1.id,
          orderNumber,
          subtotalCents: itemC.priceCents,
          totalCents: itemC.priceCents,
          idempotencyKey: `ord_c_${testRunId}`,
          items: {
            create: [{
              menuItemId: itemC.id,
              nameSnapshot: itemC.name,
              priceCentsSnapshot: itemC.priceCents,
              quantity: 1,
            }],
          },
        },
      });
    });

    // Both should start at order #1 for their respective tenant!
    expect(orderA.orderNumber).toBe(1);
    expect(orderB.orderNumber).toBe(1);
    expect(orderC.orderNumber).toBe(1);

    // Queries scoped by restaurant never leak another restaurant's orders
    const ordersA = await db.order.findMany({ where: { restaurantId: restaurantA.id } });
    expect(ordersA).toHaveLength(1);
    expect(ordersA[0].id).toBe(orderA.id);
  });

  it("handles simultaneous orders from different tables at the SAME restaurant without collision", async () => {
    // Simulate 2 guests at Table 1 and Table 2 ordering simultaneously
    async function placeOrderForTable(table: any, suffix: string) {
      let attempts = 0;
      while (attempts < 5) {
        attempts++;
        try {
          return await db.$transaction(async (tx) => {
            const last = await tx.order.findFirst({
              where: { restaurantId: restaurantA.id },
              orderBy: { orderNumber: "desc" },
              select: { orderNumber: true },
            });
            const orderNumber = (last?.orderNumber ?? 0) + 1;

            let session = await tx.tableSession.findFirst({
              where: { tableId: table.id, restaurantId: restaurantA.id, status: "OPEN" },
            });
            if (!session) {
              session = await tx.tableSession.create({
                data: { restaurantId: restaurantA.id, tableId: table.id, status: "OPEN" },
              });
            }

            return tx.order.create({
              data: {
                restaurantId: restaurantA.id,
                tableId: table.id,
                tableSessionId: session.id,
                orderNumber,
                subtotalCents: itemA.priceCents,
                totalCents: itemA.priceCents,
                idempotencyKey: `simul_${table.id}_${suffix}_${Date.now()}_${Math.random()}`,
                items: {
                  create: [{
                    menuItemId: itemA.id,
                    nameSnapshot: itemA.name,
                    priceCentsSnapshot: itemA.priceCents,
                    quantity: 1,
                  }],
                },
              },
            });
          });
        } catch (err: any) {
          if (err?.code === "P2002" && attempts < 5) {
            await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
            continue;
          }
          throw err;
        }
      }
    }

    // Run parallel orders concurrently
    const [resT1, resT2] = await Promise.all([
      placeOrderForTable(tableA1, "t1"),
      placeOrderForTable(tableA2, "t2"),
    ]);

    expect(resT1).toBeDefined();
    expect(resT2).toBeDefined();

    // Must have different order numbers, sequential and no collision
    expect(resT1?.orderNumber).not.toBe(resT2?.orderNumber);

    // Verify table sessions are distinct
    expect(resT1?.tableSessionId).not.toBe(resT2?.tableSessionId);
  });

  it("properly isolates table bills and assistance requests per table", async () => {
    // Table A1 requests assistance
    const assistOrder = await db.order.create({
      data: {
        restaurantId: restaurantA.id,
        tableId: tableA1.id,
        orderNumber: 9999,
        customerName: `Table ${tableA1.label}`,
        status: "NEW",
        subtotalCents: 0,
        totalCents: 0,
        idempotencyKey: `assist_test_${testRunId}`,
        notes: "🔔 ASSISTANCE REQUEST: Water Bottle, Extra Cutlery",
      },
    });

    expect(assistOrder.tableId).toBe(tableA1.id);
    expect(assistOrder.notes).toContain("Water Bottle");

    // Table A2 session bill should NOT contain Table A1's assistance order or items
    const sessionA2 = await db.tableSession.findFirst({
      where: { tableId: tableA2.id, restaurantId: restaurantA.id, status: "OPEN" },
      include: { orders: { include: { items: true } } },
    });

    expect(sessionA2).toBeDefined();
    for (const o of sessionA2!.orders) {
      expect(o.tableId).toBe(tableA2.id);
    }
  });
});
