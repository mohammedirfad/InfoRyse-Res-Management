import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getCustomerRows = unstable_cache(
  async (restaurantId: string, search: string, page: number, limit: number, exportAll: boolean) => db.$queryRaw<any[]>`
      WITH base AS (
        SELECT
          o."id",
          o."orderNumber",
          o."customerName",
          o."customerPhone",
          o."customerEmail",
          o."totalCents",
          o."status",
          o."createdAt",
          t."label" AS table_label,
          CASE
            WHEN NULLIF(BTRIM(o."customerPhone"), '') IS NOT NULL THEN 'phone:' || BTRIM(o."customerPhone")
            WHEN NULLIF(BTRIM(o."customerEmail"), '') IS NOT NULL THEN 'email:' || LOWER(BTRIM(o."customerEmail"))
            WHEN NULLIF(BTRIM(o."customerName"), '') IS NOT NULL THEN 'name:' || LOWER(BTRIM(o."customerName"))
            ELSE 'table:' || COALESCE(t."label", 'unknown')
          END AS customer_key,
          COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('name', i."nameSnapshot", 'quantity', i."quantity", 'price', i."priceCentsSnapshot") ORDER BY i."id")
             FROM "OrderItem" i WHERE i."orderId" = o."id"),
            '[]'::jsonb
          ) AS order_items
        FROM "Order" o
        LEFT JOIN "Table" t ON t."id" = o."tableId"
        WHERE o."restaurantId" = ${restaurantId}
          AND o."status" <> 'CANCELLED'
      ), ranked AS (
        SELECT base.*, ROW_NUMBER() OVER (PARTITION BY customer_key ORDER BY "createdAt" DESC, id DESC) AS customer_order_rank
        FROM base
      ), grouped AS (
        SELECT
          customer_key AS id,
          COALESCE(
            (ARRAY_AGG(NULLIF(BTRIM("customerName"), '') ORDER BY "createdAt" DESC) FILTER (WHERE NULLIF(BTRIM("customerName"), '') IS NOT NULL))[1],
            CASE WHEN (ARRAY_AGG(NULLIF(BTRIM("customerPhone"), '') ORDER BY "createdAt" DESC) FILTER (WHERE NULLIF(BTRIM("customerPhone"), '') IS NOT NULL))[1] IS NOT NULL
              THEN 'Guest (' || RIGHT((ARRAY_AGG(NULLIF(BTRIM("customerPhone"), '') ORDER BY "createdAt" DESC) FILTER (WHERE NULLIF(BTRIM("customerPhone"), '') IS NOT NULL))[1], 4) || ')'
              ELSE 'Table Guest' END
          ) AS name,
          COALESCE((ARRAY_AGG(NULLIF(BTRIM("customerPhone"), '') ORDER BY "createdAt" DESC) FILTER (WHERE NULLIF(BTRIM("customerPhone"), '') IS NOT NULL))[1], '') AS phone,
          COALESCE((ARRAY_AGG(NULLIF(BTRIM("customerEmail"), '') ORDER BY "createdAt" DESC) FILTER (WHERE NULLIF(BTRIM("customerEmail"), '') IS NOT NULL))[1], '') AS email,
          COUNT(*)::bigint AS order_count,
          COALESCE(SUM("totalCents"), 0)::bigint AS total_spent,
          MAX("createdAt") AS last_visit,
          MIN("createdAt") AS first_visit,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT table_label), NULL) AS tables,
          JSONB_AGG(JSONB_BUILD_OBJECT(
            'id', id,
            'orderNumber', "orderNumber",
            'totalCents', "totalCents",
            'status', "status",
            'createdAt', "createdAt",
            'tableLabel', COALESCE(table_label, ''),
            'items', order_items
          ) ORDER BY "createdAt" DESC) FILTER (WHERE customer_order_rank <= 5) AS recent_orders
        FROM ranked
        GROUP BY customer_key
      ), filtered AS (
        SELECT * FROM grouped
        WHERE ${search} = ''
          OR name ILIKE ('%' || ${search} || '%')
          OR phone ILIKE ('%' || ${search} || '%')
          OR email ILIKE ('%' || ${search} || '%')
      )
      SELECT
        filtered.*,
        COUNT(*) OVER()::bigint AS total_customers,
        COALESCE(SUM(total_spent) OVER(), 0)::bigint AS total_spent_all,
        COUNT(*) FILTER (WHERE order_count < 2 AND total_spent < 200000) OVER()::bigint AS new_count,
        COUNT(*) FILTER (WHERE order_count >= 2 AND order_count < 5 AND total_spent < 200000) OVER()::bigint AS repeat_count,
        COUNT(*) FILTER (WHERE order_count >= 5 OR total_spent >= 200000) OVER()::bigint AS vip_count
      FROM filtered
      ORDER BY last_visit DESC, id
      ${exportAll ? Prisma.empty : Prisma.sql`OFFSET ${(page - 1) * limit} LIMIT ${limit}`}
    `,
  ["admin-customer-list-v1"],
  { revalidate: 10 },
);

export async function GET(req: Request) {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));
    const exportAll = url.searchParams.get("export") === "true";

    // Aggregate customer totals, table history and the five latest orders in
    // PostgreSQL. The previous implementation loaded every order and item into
    // the Node process before returning just one page to the browser.
    const rows = await getCustomerRows(restaurantId, search, page, limit, exportAll);

    const totals = rows[0] ?? {};
    const customers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      orderCount: Number(row.order_count),
      totalSpent: Number(row.total_spent),
      lastVisit: new Date(row.last_visit).toISOString(),
      firstVisit: new Date(row.first_visit).toISOString(),
      tables: row.tables ?? [],
      status: Number(row.order_count) >= 5 || Number(row.total_spent) >= 200000
        ? "VIP"
        : Number(row.order_count) >= 2 ? "REPEAT" : "NEW",
      recentOrders: row.recent_orders ?? [],
    }));
    const totalCustomers = Number(totals.total_customers ?? 0);
    const totalSpent = Number(totals.total_spent_all ?? 0);

    if (exportAll) return Response.json({ customers, total: totalCustomers, totalSpent });

    const totalPages = Math.ceil(totalCustomers / limit) || 1;
    return Response.json({
      customers,
      pagination: { page, limit, total: totalCustomers, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      stats: {
        totalCustomers,
        totalSpent,
        newCount: Number(totals.new_count ?? 0),
        repeatCount: Number(totals.repeat_count ?? 0),
        vipCount: Number(totals.vip_count ?? 0),
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
