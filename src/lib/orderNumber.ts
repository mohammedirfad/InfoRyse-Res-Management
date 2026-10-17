import { db } from "@/lib/db";

/** Atomically reserves a tenant-local order number without locking order creation. */
export async function reserveOrderNumber(restaurantId: string) {
  const [reservation] = await db.$queryRaw<Array<{ orderNumber: number }>>`
    UPDATE "Restaurant"
    SET "nextOrderNumber" = "nextOrderNumber" + 1
    WHERE "id" = ${restaurantId}
    RETURNING "nextOrderNumber" - 1 AS "orderNumber"
  `;
  if (!reservation) throw new Error("Restaurant not found while reserving order number");
  return reservation.orderNumber;
}
